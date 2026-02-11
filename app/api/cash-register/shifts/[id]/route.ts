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
        const cashTransactions = await db.collection("cash_transactions").find({ shiftId: new ObjectId(id) }).toArray();

        // 3. General Transactions (External Manual)
        const settings = await db.collection("settings").findOne({ type: "global" });
        const posAccountIds = [
            settings?.finance?.cashAccountId,
            settings?.finance?.cardAccountId
        ].filter(Boolean);

        const startTime = new Date(shift.startTime);
        const endTime = shift.endTime ? new Date(shift.endTime) : new Date();

        const externalTransactions = await db.collection("transactions").find({
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

        // Map and merge
        const mappedExternal = externalTransactions.map(t => ({
            ...t,
            id: t._id.toString(),
            _id: undefined,
            type: t.type === 'expense' ? 'Витрата (Accounting)' : 'Прихід (Accounting)',
            amount: t.type === 'expense' ? -t.amount : t.amount,
            createdAt: t.date,
            authorName: 'Accounting',
            comment: t.description
        }));

        const mappedSupplies = supplies.map(s => ({
            ...s,
            id: s._id.toString(),
            _id: undefined,
            type: 'Постачання (Stock)',
            amount: -s.paidAmount,
            createdAt: s.date,
            authorName: s.supplierName || 'Stock',
            comment: s.description || 'Оплата постачання'
        }));

        // Merge all transactions
        const allTransactions = [
            ...cashTransactions.map(t => ({
                ...t,
                id: t._id.toString(),
                _id: undefined,
                shiftId: t.shiftId?.toString(),
                authorId: t.authorId?.toString(),
                createdAt: t.createdAt, // Ensure this property is explicitly here
                // Normalize for UI
                amount: t.type === 'expense' || t.type === 'incasation' ? -t.amount : t.amount
            })),
            ...mappedExternal,
            ...mappedSupplies
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
            transactions: allTransactions
        };

        return NextResponse.json({ success: true, data: serializedShift });

    } catch (error) {
        console.error('Error fetching shift details:', error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
