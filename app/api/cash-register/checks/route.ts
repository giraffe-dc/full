import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET: Get checks by tableId or all open checks
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const tableId = searchParams.get('tableId');
        const status = searchParams.get('status') || 'open';

        const client = await clientPromise;
        const db = client.db("giraffe");

        const filter: any = { status };
        if (tableId) {
            filter.tableId = tableId;
        }

        const checks = await db.collection("checks").find(filter).toArray();

        return NextResponse.json({
            success: true,
            data: checks.map(c => ({ ...c, id: c._id.toString() }))
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch checks" }, { status: 500 });
    }
}

// POST: Create a new check or return existing open check for value
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { tableId, tableName, departmentId, shiftId, guestsCount, waiterId, waiterName } = body;

        if (!tableId || !shiftId) {
            return NextResponse.json({ error: "Table ID and Shift ID are required" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db("giraffe");

        // 1. Check if there is already an open check for this table
        const existingCheck = await db.collection("checks").findOne({
            tableId,
            status: 'open'
        });

        if (existingCheck) {
            return NextResponse.json({
                success: true,
                data: { ...existingCheck, id: existingCheck._id.toString() },
                message: "Existing check returned"
            });
        }

        // 2. Create new check
        const newCheck = {
            tableId,
            tableName,
            departmentId,
            shiftId,
            waiterId,
            waiterName,
            items: [],
            guestsCount: guestsCount || 1,
            status: 'open',
            subtotal: 0,
            tax: 0,
            total: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            history: [{
                action: 'created',
                changedBy: waiterName || 'Waiter',
                date: new Date().toISOString(),
                newValue: 'Check created'
            }]
        };

        const result = await db.collection("checks").insertOne(newCheck);

        // 3. Mark table as busy and set guest count
        await db.collection("tables").updateOne(
            { _id: new ObjectId(tableId) },
            { $set: { status: 'busy', seats: guestsCount || 1 } }
        );

        return NextResponse.json({
            success: true,
            data: { ...newCheck, id: result.insertedId.toString() }
        });

    } catch (error) {
        console.error("Create Check Error", error);
        return NextResponse.json({ error: "Failed to create check" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, items, subtotal, tax, total, comment, customerId, customerName, discount, appliedPromotionId, user, guestsCount } = body; // user can be passed for history

        if (!id) return NextResponse.json({ error: "Check ID required" }, { status: 400 });

        const client = await clientPromise;
        const db = client.db("giraffe");

        const existingCheck = await db.collection("checks").findOne({ _id: new ObjectId(id) });

        let historyEntries: any[] = [];
        const author = user || existingCheck?.waiterName || 'System';

        // Helper to add history
        const addHistory = (action: string, prev: any, curr: any) => {
            historyEntries.push({
                action,
                changedBy: author,
                date: new Date().toISOString(),
                previousValue: prev,
                newValue: curr
            });
        };

        if (existingCheck) {
            if (items && JSON.stringify(items) !== JSON.stringify(existingCheck.items)) {
                // We simplify log for items, user can expand if needed or we can diff
                // For now, general update log
                historyEntries.push({
                    action: 'update_items',
                    changedBy: author,
                    date: new Date().toISOString(),
                    previousDetails: existingCheck.items,
                    newDetails: items
                });
            }
            if (discount !== undefined && discount !== existingCheck.discount) {
                addHistory('update_discount', existingCheck.discount || 0, discount);
            }
            if (comment !== undefined && comment !== existingCheck.comment) {
                addHistory('update_comment', existingCheck.comment || '', comment);
            }
            if (guestsCount !== undefined && guestsCount !== existingCheck.guestsCount) {
                addHistory('update_guests', existingCheck.guestsCount, guestsCount);
            }
        }

        // If no specific changes detected (or just simple save), verify length
        // But for safety, always adding to history might be spammy. 
        // Let's rely on passed changes.

        await db.collection("checks").updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    items,
                    subtotal,
                    tax,
                    total,
                    comment,
                    customerId,
                    customerName,
                    discount: discount,
                    appliedPromotionId: appliedPromotionId,
                    updatedAt: new Date().toISOString()
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

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: "Check ID required" }, { status: 400 });

        const client = await clientPromise;
        const db = client.db("giraffe");

        // Get tableId before deleting to free it
        const check = await db.collection("checks").findOne({ _id: new ObjectId(id) });

        await db.collection("checks").deleteOne({ _id: new ObjectId(id) });

        if (check && check.tableId) {
            await db.collection("tables").updateOne(
                { _id: new ObjectId(check.tableId) },
                { $set: { status: 'free', seats: 4 } }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete check" }, { status: 500 });
    }
}
