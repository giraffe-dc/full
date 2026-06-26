import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { calculateSalesCash, calculateSalesCard } from "@/lib/deposit-utils";

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
        const transactions = await db.collection("cash_transactions").find({ shiftId: new ObjectId(id), isDeleted: { $ne: true } }).toArray();

        const totalSales = receipts.reduce((sum, r) => sum + (r.total || 0), 0);
        // Продажі з чеків: універсальна формула з deposit-utils
        const totalSalesCash = receipts
            .filter((r: any) => r.paymentMethod === 'cash' || r.paymentMethod === 'mixed')
            .reduce((sum: number, r: any) => sum + calculateSalesCash(r), 0);
        const totalSalesCard = receipts
            .filter((r: any) => r.paymentMethod === 'card' || r.paymentMethod === 'mixed')
            .reduce((sum: number, r: any) => sum + calculateSalesCard(r), 0);

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

        // Filter out sales-related and deposit transactions to match X-Report logic
        const manualTransactions = allTransactions.filter(t =>
            t.category !== 'sales'
            && t.category !== 'deposit'
            && t.category !== 'deposit_refund'
            && t.category !== 'deposit_audit'
            && t.source !== 'cash-register'
        );

        // Депозити поточної зміни (додаємо до продажів)
        const depositCash = transactions
            .filter(t => t.category === 'deposit' && (t.paymentMethod === 'cash' || !t.paymentMethod))
            .reduce((sum, t) => sum + (t.amount || 0), 0);
        const depositCard = transactions
            .filter(t => t.category === 'deposit' && t.paymentMethod === 'card')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

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
        // Logic: Start Balance + (Cash Sales + Cash Deposits) + Manual Income - Manual Expenses - Incasation
        const expectedBalance = startBalance + (totalSalesCash + depositCash) + totalIncome - totalExpenses - totalIncasation;

        const data = {
            startBalance,
            totalSales,
            totalSalesCash: totalSalesCash + depositCash,  // Готівкові депозити = "Продажі (Готівка)"
            totalSalesCard: totalSalesCard + depositCard,  // Карткові депозити = "Продажі (Карта)"
            totalIncome,  // Тільки ручні доходи (без депозитів)
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
