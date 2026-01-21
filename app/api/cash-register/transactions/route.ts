
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { shiftId, type, category, amount, comment, authorId, authorName } = body;

        if (!shiftId || !type || !amount) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db("giraffe");

        const newTransaction = {
            shiftId: new ObjectId(shiftId),
            type, // 'income', 'expense', 'incasation'
            category: category || null,
            amount: Number(amount),
            comment: comment || "",
            authorId: authorId || null,
            authorName: authorName || "Unknown",
            createdAt: new Date()
        };

        const result = await db.collection("cash_transactions").insertOne(newTransaction);

        return NextResponse.json({
            success: true,
            data: { ...newTransaction, id: result.insertedId.toString(), shiftId: shiftId }
        });

    } catch (error) {
        console.error("Transaction Error", error);
        return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const shiftId = searchParams.get('shiftId');

        if (!shiftId) {
            return NextResponse.json({ error: "Shift ID is required" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db("giraffe");

        const transactions = await db.collection("cash_transactions")
            .find({ shiftId: new ObjectId(shiftId) })
            .sort({ createdAt: -1 })
            .toArray();

        const data = transactions.map(t => ({
            ...t,
            id: t._id.toString(),
            shiftId: t.shiftId.toString()
        }));

        return NextResponse.json({ success: true, data });
    } catch (e) {
        return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, type, category, amount, comment } = body;

        if (!id) return NextResponse.json({ error: "Transaction ID required" }, { status: 400 });

        const client = await clientPromise;
        const db = client.db("giraffe");

        // Handle Open Shift Update
        if (id.startsWith('open-')) {
            const shiftId = id.replace('open-', '');
            await db.collection("cash_shifts").updateOne(
                { _id: new ObjectId(shiftId) },
                { $set: { startBalance: Number(amount) } }
            );
            return NextResponse.json({ success: true, message: "Shift start balance updated" });
        }

        // Handle Close Shift Update
        if (id.startsWith('close-')) {
            const shiftId = id.replace('close-', '');
            // Update both actualBalance and endBalance to keep them in sync or adhering to business logic
            // endBalance usually means the finalized balance.
            await db.collection("cash_shifts").updateOne(
                { _id: new ObjectId(shiftId) },
                { $set: { endBalance: Number(amount), actualBalance: Number(amount) } }
            );
            return NextResponse.json({ success: true, message: "Shift end balance updated" });
        }

        // Normal Transaction Update
        await db.collection("cash_transactions").updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    type,
                    category,
                    amount: Number(amount),
                    comment,
                    updatedAt: new Date()
                }
            }
        );

        return NextResponse.json({ success: true, message: "Transaction updated" });
    } catch (e) {
        return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: "Transaction ID required" }, { status: 400 });

        const client = await clientPromise;
        const db = client.db("giraffe");

        await db.collection("cash_transactions").deleteOne({ _id: new ObjectId(id) });

        return NextResponse.json({ success: true, message: "Transaction deleted" });
    } catch (e) {
        return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
    }
}
