import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// PUT: Update check items
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { items, subtotal, tax, total, customerId, customerName } = body;

        const client = await clientPromise;
        const db = client.db("giraffe");

        await db.collection("checks").updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    items,
                    tax,
                    total,
                    customerId,
                    customerName,
                    comment: body.comment,
                    updatedAt: new Date()
                }
            }
        );

        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ error: "Failed to update check" }, { status: 500 });
    }
}

// DELETE: Cancel check (or specialized logic to close/void)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        const client = await clientPromise;
        const db = client.db("giraffe");

        // Get check to know tableId
        const check = await db.collection("checks").findOne({ _id: new ObjectId(id) });
        if (!check) return NextResponse.json({ error: "Check not found" }, { status: 404 });

        // Delete check
        await db.collection("checks").deleteOne({ _id: new ObjectId(id) });

        // Free up the table and reset seats
        await db.collection("tables").updateOne(
            { _id: new ObjectId(check.tableId) },
            { $set: { status: 'free', seats: 0 } }
        );

        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ error: "Failed to delete check" }, { status: 500 });
    }
}
