import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        if (!id) return NextResponse.json({ error: "Shift ID required" }, { status: 400 });

        const client = await clientPromise;
        const db = client.db("giraffe");

        const shift = await db.collection("cash_shifts").findOne({ _id: new ObjectId(id) });
        if (!shift) {
            return NextResponse.json({ error: "Shift not found" }, { status: 404 });
        }

        const receipts = await db.collection("receipts").find({ shiftId: new ObjectId(id) }).toArray();
        const transactions = await db.collection("cash_transactions").find({ shiftId: new ObjectId(id) }).toArray();

        const totalSales = receipts.reduce((sum, r) => sum + (r.total || 0), 0);
        const totalSalesCash = receipts
            .filter(r => r.paymentMethod === 'cash' || r.paymentMethod === 'mixed')
            .reduce((sum, r) => sum + (r.paymentMethod === 'mixed' ? (r.paymentDetails?.cash || 0) : r.total), 0);
        const totalSalesCard = receipts
            .filter(r => r.paymentMethod === 'card' || r.paymentMethod === 'mixed')
            .reduce((sum, r) => sum + (r.paymentMethod === 'mixed' ? (r.paymentDetails?.card || 0) : r.total), 0);

        // 3. General Transactions (External Manual)
        const settings = await db.collection("settings").findOne({ type: "global" });
        const posAccountIds = [
            settings?.finance?.cashAccountId,
            settings?.finance?.cardAccountId
        ].filter(Boolean);

        const startTime = new Date(shift.startTime);
        const endTime = shift.endTime ? new Date(shift.endTime) : new Date();

        const externalTransactions = await db.collection("transactions").find({
            paymentMethod: 'cash',
            $or: [
                { shiftId: new ObjectId(id), moneyAccountId: { $in: posAccountIds } },
                {
                    date: { $gte: startTime, $lte: endTime },
                    shiftId: { $exists: false },
                    moneyAccountId: { $in: posAccountIds }
                }
            ]
        }).toArray();

        // 4. Stock Supplies
        const supplies = await db.collection("stock_movements")
            .find({
                type: 'supply',
                paidAmount: { $gt: 0 },
                paymentMethod: 'cash',
                $or: [
                    { shiftId: new ObjectId(id), moneyAccountId: { $in: posAccountIds } },
                    {
                        date: { $gte: startTime, $lte: endTime },
                        shiftId: { $exists: false },
                        moneyAccountId: { $in: posAccountIds }
                    }
                ]
            })
            .toArray();

        // Map external transactions to match cash_transaction structure roughly for calculation
        const mappedExternal = externalTransactions.map(t => ({
            ...t,
            type: t.type, // 'income' or 'expense'
            amount: t.amount,
            category: t.category,
            source: t.source
        }));

        const mappedSupplies = supplies.map(s => ({
            ...s,
            type: 'expense',
            amount: s.paidAmount, // It is an expense, so we need the amount. Logic below sums amounts based on type.
            category: 'supply',
            source: 'stock'
        }));

        // Merge all transactions
        const allTransactions = [
            ...transactions,
            ...mappedExternal,
            ...mappedSupplies
        ];

        // Filter out sales-related transactions to match X-Report logic
        const manualTransactions = allTransactions.filter(t =>
            t.category !== 'sales' && t.source !== 'cash-register'
        );

        const totalIncome = manualTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const totalExpenses = manualTransactions
            .filter(t => t.type === 'expense' || t.category === 'supply')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const totalIncasation = manualTransactions
            .filter(t => t.type === 'incasation')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const startBalance = shift.startBalance || 0;
        // Logic: Start Balance + Cash Sales + Manual Income - Manual Expenses - Incasation
        const expectedBalance = startBalance + totalSalesCash + totalIncome - totalExpenses - totalIncasation;

        const data = {
            startBalance,
            totalSales,
            totalSalesCash,
            totalSalesCard,
            totalIncome,
            totalExpenses,
            totalIncasation,
            expectedBalance
        };

        return NextResponse.json({ success: true, data });

    } catch (error) {
        console.error('Error closing shift preview:', error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
