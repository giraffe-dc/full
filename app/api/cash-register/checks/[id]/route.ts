import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET: Get single check by ID (searches in checks first, then receipts)
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const client = await clientPromise;
        const db = client.db("giraffe");

        // Attempt 1: Search in checks (if not deleted yet)
        let check = await db.collection("checks").findOne({
            _id: new ObjectId(id)
        });

        if (check) {
            return NextResponse.json({
                success: true,
                data: { ...check, id: check._id.toString(), source: 'checks' }
            });
        }

        // Attempt 2: Search in receipts by checkId
        check = await db.collection("receipts").findOne({
            checkId: id  // Search by checkId link
        });

        if (check) {
            return NextResponse.json({
                success: true,
                data: {
                    ...check,
                    id: check._id.toString(),
                    source: 'receipts',
                    _id: check.checkId  // Return original ID for compatibility
                }
            });
        }

        return NextResponse.json({
            error: "Check not found"
        }, { status: 404 });

    } catch (error) {
        console.error("Error fetching check:", error);
        return NextResponse.json({
            error: "Failed to fetch check"
        }, { status: 500 });
    }
}

// PUT: Update check items
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { items, subtotal, tax, total, customerId, customerName, user, guestsCount } = body;

        const client = await clientPromise;
        const db = client.db("giraffe");

        const existingCheck = await db.collection("checks").findOne({ _id: new ObjectId(id) });

        // History Logic
        let historyEntries: any[] = [];
        const author = user || existingCheck?.waiterName || 'System';

        if (existingCheck) {
            if (items && JSON.stringify(items) !== JSON.stringify(existingCheck.items)) {
                historyEntries.push({
                    action: 'update_items',
                    changedBy: author,
                    date: new Date().toISOString(),
                    previousDetails: existingCheck.items,
                    newDetails: items
                });
            }
            // Check other fields
            const checkField = (fieldName: string, label: string) => {
                const val = body[fieldName];
                const oldVal = existingCheck[fieldName];
                if (val !== undefined && val !== oldVal) {
                    historyEntries.push({
                        action: `update_${fieldName}`,
                        changedBy: author,
                        date: new Date().toISOString(),
                        previousValue: oldVal,
                        newValue: val
                    });
                }
            };

            checkField('discount', 'discount');
            checkField('comment', 'comment');
            checkField('guestsCount', 'guests');
        }

        await db.collection("checks").updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    items,
                    tax,
                    total,
                    subtotal,
                    customerId,
                    customerName,
                    discount: body.discount,
                    appliedPromotionId: body.appliedPromotionId,
                    comment: body.comment,
                    guestsCount: guestsCount !== undefined ? guestsCount : existingCheck?.guestsCount,
                    updatedAt: new Date()
                },
                $push: {
                    history: { $each: historyEntries }
                } as any
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

        // --- NEW: Cancel linked Event status ---
        // Search for an event that is linked to this checkId (which is the parameter 'id')
        await db.collection("events").updateMany(
            { checkId: id },
            {
                $set: {
                    status: 'cancelled',
                    updatedAt: new Date().toISOString()
                }
            }
        );

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
