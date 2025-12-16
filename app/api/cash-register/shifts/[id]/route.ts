import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        if (!id) return NextResponse.json({ error: "Shift ID required" }, { status: 400 });

        const client = await clientPromise;
        const db = client.db("giraffe");

        const shift = await db.collection("cash_shifts").findOne({ _id: new ObjectId(id) });

        if (!shift) {
            return NextResponse.json({ error: "Shift not found" }, { status: 404 });
        }

        // Fetch receipts for this shift
        const receipts = await db.collection("receipts").find({ shiftId: new ObjectId(id) }).toArray();
        const transactions = await db.collection("cash_transactions").find({ shiftId: new ObjectId(id) }).toArray();

        // Serialize ObjectIds
        const serializedShift = {
            ...shift,
            id: shift._id.toString(),
            _id: undefined,
            receipts: receipts.map(r => ({
                ...r,
                id: r._id.toString(),
                _id: undefined,
                shiftId: r.shiftId?.toString(),
                customerId: r.customerId?.toString()
            })),
            transactions: transactions.map(t => ({
                ...t,
                id: t._id.toString(),
                _id: undefined,
                shiftId: t.shiftId?.toString(),
                authorId: t.authorId?.toString()
            }))
        };

        return NextResponse.json({ success: true, data: serializedShift });

    } catch (error) {
        console.error('Error fetching shift details:', error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
