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
            .filter(r => r.paymentMethod === 'cash')
            .reduce((sum, r) => sum + (r.total || 0), 0);
        const totalSalesCard = receipts
            .filter(r => r.paymentMethod === 'card')
            .reduce((sum, r) => sum + (r.total || 0), 0);

        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const totalExpenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const totalIncasation = transactions
            .filter(t => t.type === 'incasation')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const startBalance = shift.startBalance || 0;
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
