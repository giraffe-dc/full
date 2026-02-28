import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        const client = await clientPromise;
        const db = client.db("giraffe");

        // Date Filter
        const dateFilter: any = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) {
            const endD = new Date(endDate);
            endD.setHours(23, 59, 59, 999);
            dateFilter.$lte = endD;
        }

        const matchDate = (field: string) =>
            Object.keys(dateFilter).length ? { [field]: dateFilter } : {};

        // Fetch Settings for Account Resolution
        const settings = await db.collection("settings").findOne({ type: "global" });
        const financeSettings = settings?.finance || {};
        const cashAccountId = financeSettings.cashAccountId;
        const cardAccountId = financeSettings.cardAccountId;

        // 1. Manual Transactions
        const txRaw = await db
            .collection("transactions")
            .find({ ...matchDate("date"), source: { $ne: "cash-register" } })
            .toArray();

        // 2. Stock Supplies (COGS)
        const suppliesRaw = await db
            .collection("stock_movements")
            .find({ type: "supply", ...matchDate("date"), paidAmount: { $gt: 0 } })
            .toArray();

        // 3. Receipts (Sales Income)
        const receiptsRaw = await db
            .collection("receipts")
            .find({ ...matchDate("createdAt") })
            .toArray();

        // 4. Closed Shifts
        const shiftsRaw = await db
            .collection("cash_shifts")
            .find({ status: "closed", ...matchDate("endTime") })
            .toArray();

        // 5. Cash Transactions
        const cashTxRaw = await db
            .collection("cash_transactions")
            .find({ ...matchDate("createdAt") })
            .toArray();

        // 6. Salary payments
        const salaryRaw = await db
            .collection("salary")
            .find({ status: "paid" })
            .toArray();

        // --- Aggregate P&L ---

        // REVENUE (Income)
        const revenueByCategory: Record<string, number> = {};

        // Shift summaries -> sales income
        for (const s of shiftsRaw) {
            let totalSalesCash = s.totalSalesCash;
            let totalSalesCard = s.totalSalesCard;

            if (totalSalesCash === undefined || totalSalesCard === undefined) {
                const shiftReceipts = receiptsRaw.filter(
                    (r: any) =>
                        r.shiftId?.toString() === s._id.toString() ||
                        (new Date(r.createdAt) >= new Date(s.startTime) &&
                            new Date(r.createdAt) <= new Date(s.endTime))
                );
                totalSalesCash = shiftReceipts
                    .filter((r: any) => r.paymentMethod === "cash" || r.paymentMethod === "mixed")
                    .reduce(
                        (acc: number, r: any) =>
                            acc + (r.paymentMethod === "mixed" ? r.paymentDetails?.cash || 0 : r.total),
                        0
                    );
                totalSalesCard = shiftReceipts
                    .filter((r: any) => r.paymentMethod === "card" || r.paymentMethod === "mixed")
                    .reduce(
                        (acc: number, r: any) =>
                            acc + (r.paymentMethod === "mixed" ? r.paymentDetails?.card || 0 : r.total),
                        0
                    );
            }

            const salesTotal = (totalSalesCash || 0) + (totalSalesCard || 0);
            if (salesTotal > 0) {
                revenueByCategory["Продажі (каса)"] =
                    (revenueByCategory["Продажі (каса)"] || 0) + salesTotal;
            }
        }

        // Standalone receipts (no shiftId)
        for (const r of receiptsRaw.filter((r: any) => !r.shiftId)) {
            const amt = r.total || 0;
            if (amt > 0) {
                revenueByCategory["Продажі (чеки)"] =
                    (revenueByCategory["Продажі (чеки)"] || 0) + amt;
            }
        }

        // Manual income transactions
        for (const t of txRaw) {
            if (t.type === "income") {
                const cat = t.category || "other";
                const label =
                    cat === "sales" ? "Продажі (ручні)" : cat === "other" ? "Інший дохід" : cat;
                revenueByCategory[label] = (revenueByCategory[label] || 0) + (t.amount || 0);
            }
        }

        // Cash register income (not incasation)
        for (const ct of cashTxRaw) {
            if (ct.type === "income") {
                revenueByCategory["Внесення (каса)"] =
                    (revenueByCategory["Внесення (каса)"] || 0) + (Number(ct.amount) || 0);
            }
        }

        const totalRevenue = Object.values(revenueByCategory).reduce((s, v) => s + v, 0);

        // COGS (Cost of Goods Sold) — stock supplies
        const cogsByCategory: Record<string, number> = {};
        for (const s of suppliesRaw) {
            const supplier = s.supplierName || "Інше";
            cogsByCategory[supplier] = (cogsByCategory[supplier] || 0) + (s.paidAmount || 0);
        }
        const totalCOGS = Object.values(cogsByCategory).reduce((s, v) => s + v, 0);

        const grossProfit = totalRevenue - totalCOGS;

        // OPEX (Operating Expenses)
        const opexByCategory: Record<string, number> = {};

        // Manual expense transactions (excluding stock/supply category)
        for (const t of txRaw) {
            if (t.type === "expense" && t.category !== "incasation" && t.category !== "stock") {
                const cat = t.category || "other";
                const label = cat === "other" ? "Інші витрати" : cat;
                opexByCategory[label] = (opexByCategory[label] || 0) + (t.amount || 0);
            }
        }

        // Cash register expenses (not incasation)
        for (const ct of cashTxRaw) {
            if (ct.type === "expense") {
                const cat = ct.category || "Витрати (каса)";
                opexByCategory[cat] = (opexByCategory[cat] || 0) + (Number(ct.amount) || 0);
            }
        }

        // Salary
        const totalSalary = salaryRaw.reduce((s: number, sr: any) => s + (sr.toPay || 0), 0);
        if (totalSalary > 0) {
            opexByCategory["Зарплата"] = (opexByCategory["Зарплата"] || 0) + totalSalary;
        }

        const totalOPEX = Object.values(opexByCategory).reduce((s, v) => s + v, 0);

        const operatingProfit = grossProfit - totalOPEX;
        const netProfit = operatingProfit; // No taxes/interest for now

        // Daily trend data for chart
        const dailyMap = new Map<string, { income: number; expense: number }>();

        // Add shift sales to daily
        for (const s of shiftsRaw) {
            if (!s.endTime) continue;
            const date = new Date(s.endTime).toISOString().split("T")[0];
            const current = dailyMap.get(date) || { income: 0, expense: 0 };

            let totalSales = (s.totalSalesCash || 0) + (s.totalSalesCard || 0);
            if (!s.totalSalesCash && !s.totalSalesCard) {
                const shiftReceipts = receiptsRaw.filter(
                    (r: any) =>
                        r.shiftId?.toString() === s._id.toString() ||
                        (new Date(r.createdAt) >= new Date(s.startTime) &&
                            new Date(r.createdAt) <= new Date(s.endTime))
                );
                totalSales = shiftReceipts.reduce((acc: number, r: any) => acc + (r.total || 0), 0);
            }

            current.income += totalSales;
            dailyMap.set(date, current);
        }

        // Add manual transactions to daily
        for (const t of txRaw) {
            if (t.category === "incasation") continue;
            const date = new Date(t.date).toISOString().split("T")[0];
            const current = dailyMap.get(date) || { income: 0, expense: 0 };
            if (t.type === "income") current.income += t.amount || 0;
            else if (t.type === "expense") current.expense += t.amount || 0;
            dailyMap.set(date, current);
        }

        // Add supplies to daily expenses
        for (const s of suppliesRaw) {
            const date = new Date(s.date).toISOString().split("T")[0];
            const current = dailyMap.get(date) || { income: 0, expense: 0 };
            current.expense += s.paidAmount || 0;
            dailyMap.set(date, current);
        }

        const dailyStats = Array.from(dailyMap.entries())
            .map(([dateKey, { income, expense }]) => ({
                dateKey,
                income,
                expense,
                profit: income - expense,
            }))
            .sort((a, b) => new Date(a.dateKey).getTime() - new Date(b.dateKey).getTime());

        return NextResponse.json({
            revenue: {
                total: totalRevenue,
                categories: Object.entries(revenueByCategory)
                    .map(([name, amount]) => ({ name, amount }))
                    .sort((a, b) => b.amount - a.amount),
            },
            cogs: {
                total: totalCOGS,
                categories: Object.entries(cogsByCategory)
                    .map(([name, amount]) => ({ name, amount }))
                    .sort((a, b) => b.amount - a.amount),
            },
            grossProfit,
            opex: {
                total: totalOPEX,
                categories: Object.entries(opexByCategory)
                    .map(([name, amount]) => ({ name, amount }))
                    .sort((a, b) => b.amount - a.amount),
            },
            operatingProfit,
            netProfit,
            dailyStats,
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
