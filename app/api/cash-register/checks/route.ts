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
            updatedAt: new Date().toISOString()
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
        const { id, items, subtotal, tax, total, comment, customerId, customerName } = body;

        if (!id) return NextResponse.json({ error: "Check ID required" }, { status: 400 });

        const client = await clientPromise;
        const db = client.db("giraffe");

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
                    updatedAt: new Date().toISOString()
                }
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
