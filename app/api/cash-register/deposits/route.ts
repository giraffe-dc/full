import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// GET — Список всіх передплат за період
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const client = await clientPromise;
    const db = client.db("giraffe");

    const dateFilter: any = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);

    // Активні передплати (відкриті чеки з deposit)
    const activeQuery: any = { paymentStatus: 'deposit', deposit: { $ne: null } };
    const activeDeposits = await db.collection("checks").find(activeQuery).toArray();

    // Касові транзакції deposit/deposit_refund за період
    const txQuery: any = {
        category: { $in: ['deposit', 'deposit_refund'] },
        isDeleted: { $ne: true }
    };
    if (from || to) {
        txQuery.createdAt = dateFilter;
    }
    const transactions = await db.collection("cash_transactions")
        .find(txQuery)
        .sort({ createdAt: -1 })
        .toArray();

    // Агрегація
    const totalActiveAmount = activeDeposits.reduce((sum: number, c: any) => sum + (c.paidAmount || 0), 0);

    const totalDeposited = transactions
        .filter((t: any) => t.category === 'deposit')
        .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

    const totalRefunded = transactions
        .filter((t: any) => t.category === 'deposit_refund')
        .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

    return NextResponse.json({
        success: true,
        data: {
            activeDeposits: activeDeposits.map((c: any) => ({
                id: c._id.toString(),
                tableName: c.tableName,
                total: c.total,
                paidAmount: c.paidAmount,
                depositMethod: c.deposit?.method,
                createdAt: c.deposit?.createdAt,
                authorName: c.deposit?.authorName
            })),
            stats: {
                activeCount: activeDeposits.length,
                totalActiveAmount,
                totalDeposited,
                totalRefunded
            },
            transactions: transactions.map((t: any) => ({
                id: t._id.toString(),
                category: t.category,
                amount: t.amount,
                paymentMethod: t.paymentMethod,
                comment: t.comment,
                authorName: t.authorName,
                createdAt: t.createdAt
            }))
        }
    });
}
