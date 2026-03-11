import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// POST: Void/Cancel check (mark as voided, delete check, free table, update event)
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const client = await clientPromise;
        const db = client.db("giraffe");

        // Get check to get tableId and other data
        const check = await db.collection("checks").findOne({ _id: new ObjectId(id) });
        if (!check) {
            return NextResponse.json({ error: "Check not found" }, { status: 404 });
        }

        // Add void history entry
        const voidHistory = {
            action: 'void',
            changedBy: check.waiterName || 'System',
            date: new Date().toISOString(),
            reason: 'Анульовано як помилковий'
        };

        // Update check with void status before deletion (for audit trail in receipts if needed)
        await db.collection("checks").updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    status: 'voided',
                    voidedAt: new Date(),
                    updatedAt: new Date()
                },
                $push: { history: voidHistory }
            }
        );

        // --- Update linked Event status ---
        await db.collection("events").updateMany(
            { checkId: id },
            {
                $set: {
                    status: 'cancelled',
                    paymentStatus: 'unpaid',
                    updatedAt: new Date().toISOString()
                }
            }
        );

        // Free up the table and reset seats
        if (check.tableId) {
            await db.collection("tables").updateOne(
                { _id: new ObjectId(check.tableId) },
                { $set: { status: 'free', seats: 4 } }
            );
        }

        // Delete the check
        await db.collection("checks").deleteOne({ _id: new ObjectId(id) });

        return NextResponse.json({ success: true, message: "Чек анульовано" });

    } catch (error) {
        console.error("Void check error:", error);
        return NextResponse.json({ error: "Failed to void check" }, { status: 500 });
    }
}
