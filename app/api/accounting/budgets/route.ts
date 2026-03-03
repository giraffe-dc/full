import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";
import type { BudgetItem, BudgetWithTotals } from "../../../../types/accounting";

/**
 * GET /api/accounting/budgets
 * Get budget items for a specific month with actual amounts from P&L data
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const month = searchParams.get("month"); // YYYY-MM format

        if (!month) {
            return NextResponse.json(
                { error: "Потрібно вказати month (YYYY-MM)" },
                { status: 400 }
            );
        }

        const client = await clientPromise;
        const db = client.db("giraffe");

        // Fetch budget items from database
        const budgetItems = await db
            .collection<BudgetItem>("budgets")
            .find({ month })
            .toArray();

        // Calculate actual amounts from transactions for the same period
        const startDate = `${month}-01`;
        const endDate = `${month}-31`;

        // Fetch actual expenses from transactions
        const transactions = await db
            .collection("transactions")
            .find({
                type: "expense",
                date: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate),
                },
                category: { $ne: "incasation" },
            })
            .toArray();

        // Fetch actual COGS from stock movements
        const stockMovements = await db
            .collection("stock_movements")
            .find({
                type: "supply",
                date: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate),
                },
                paidAmount: { $gt: 0 },
            })
            .toArray();

        // Calculate actual amounts by category
        const actualByCategory: Record<string, number> = {};

        // From transactions
        for (const t of transactions) {
            const cat = t.category || "other";
            actualByCategory[cat] = (actualByCategory[cat] || 0) + (t.amount || 0);
        }

        // From stock movements (COGS)
        for (const s of stockMovements) {
            const supplier = s.supplierName || "Інше";
            actualByCategory[supplier] =
                (actualByCategory[supplier] || 0) + (s.paidAmount || 0);
        }

        // Add salary
        const salaryPayments = await db
            .collection("salary")
            .find({
                status: "paid",
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate),
                },
            })
            .toArray();

        const totalSalary = salaryPayments.reduce(
            (sum, s) => sum + (s.toPay || 0),
            0
        );
        if (totalSalary > 0) {
            actualByCategory["Зарплата"] =
                (actualByCategory["Зарплата"] || 0) + totalSalary;
        }

        // Enrich budget items with actual amounts and variances
        const enrichedItems = budgetItems.map((item) => {
            const actual = actualByCategory[item.categoryName] || 0;
            const variance = actual - item.plannedAmount;
            const variancePercent =
                item.plannedAmount > 0 ? (variance / item.plannedAmount) * 100 : 0;

            return {
                ...item,
                actualAmount: actual,
                variance,
                variancePercent,
            };
        });

        // Calculate totals
        const totalPlanned = enrichedItems.reduce(
            (sum, item) => sum + item.plannedAmount,
            0
        );
        const totalActual = enrichedItems.reduce(
            (sum, item) => sum + (item.actualAmount || 0),
            0
        );
        const totalVariance = totalActual - totalPlanned;
        const totalVariancePercent =
            totalPlanned > 0 ? (totalVariance / totalPlanned) * 100 : 0;

        const result: BudgetWithTotals = {
            items: enrichedItems,
            totals: {
                totalPlanned,
                totalActual,
                totalVariance,
                totalVariancePercent,
            },
        };

        return NextResponse.json(result);
    } catch (err) {
        console.error("Budget API Error:", err);
        return NextResponse.json(
            {
                error: "Помилка отримання бюджету",
                details: err instanceof Error ? err.message : "Невідома помилка",
            },
            { status: 500 }
        );
    }
}

/**
 * POST /api/accounting/budgets
 * Create or update budget items for a month
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { month, items } = body;

        if (!month || !Array.isArray(items)) {
            return NextResponse.json(
                { error: "Потрібно вказати month та items" },
                { status: 400 }
            );
        }

        const client = await clientPromise;
        const db = client.db("giraffe");

        // Validate month format (YYYY-MM)
        if (!/^\d{4}-\d{2}$/.test(month)) {
            return NextResponse.json(
                { error: "Невірний формат month (очікується YYYY-MM)" },
                { status: 400 }
            );
        }

        const now = new Date().toISOString();
        const operations = items.map((item) => ({
            updateOne: {
                filter: { month, categoryId: item.categoryId },
                update: {
                    $set: {
                        ...item,
                        month,
                        updatedAt: now,
                    },
                    $setOnInsert: {
                        createdAt: now,
                    },
                },
                upsert: true,
            },
        }));

        if (operations.length > 0) {
            await db.collection<BudgetItem>("budgets").bulkWrite(operations);
        }

        // Fetch updated data
        const updatedItems = await db
            .collection<BudgetItem>("budgets")
            .find({ month })
            .toArray();

        const totalPlanned = updatedItems.reduce(
            (sum, item) => sum + item.plannedAmount,
            0
        );

        return NextResponse.json({
            items: updatedItems,
            totals: {
                totalPlanned,
                totalActual: 0,
                totalVariance: 0,
                totalVariancePercent: 0,
            },
        });
    } catch (err) {
        console.error("Budget Save Error:", err);
        return NextResponse.json(
            {
                error: "Помилка збереження бюджету",
                details: err instanceof Error ? err.message : "Невідома помилка",
            },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/accounting/budgets
 * Delete budget items for a specific month or category
 */
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const month = searchParams.get("month");
        const categoryId = searchParams.get("categoryId");

        if (!month) {
            return NextResponse.json(
                { error: "Потрібно вказати month" },
                { status: 400 }
            );
        }

        const client = await clientPromise;
        const db = client.db("giraffe");

        const filter: Record<string, string> = { month };
        if (categoryId) {
            filter.categoryId = categoryId;
        }

        await db.collection<BudgetItem>("budgets").deleteMany(filter);

        return NextResponse.json({ success: true, deleted: filter });
    } catch (err) {
        console.error("Budget Delete Error:", err);
        return NextResponse.json(
            {
                error: "Помилка видалення бюджету",
                details: err instanceof Error ? err.message : "Невідома помилка",
            },
            { status: 500 }
        );
    }
}
