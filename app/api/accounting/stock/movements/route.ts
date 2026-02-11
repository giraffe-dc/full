
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db('giraffe');
        const searchParams = req.nextUrl.searchParams;
        const type = searchParams.get("type");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const isDeletedSource = searchParams.get("isDeleted");
        const warehouseId = searchParams.get("warehouseId");
        const itemId = searchParams.get("itemId");

        const query: any = {};
        if (type) query.type = type;
        if (warehouseId) query.warehouseId = warehouseId;
        if (itemId) query["items.itemId"] = itemId;

        // Handle isDeleted: 'true' returns ONLY deleted, 'false' or undefined returns ONLY active
        if (isDeletedSource === 'true') {
            query.isDeleted = true;
        } else {
            query.isDeleted = { $ne: true };
        }

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        const movements = await db.collection("stock_movements")
            .find(query)
            .sort({ date: -1 })
            .toArray();

        // Enrich with supplier names if needed, but frontend does that usually. 
        // For search optimization, we might eventually standardise, but for now raw data is fine.

        return NextResponse.json({ data: movements });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db('giraffe');
        const body = await req.json();

        // Validations
        if (!body.type || !['supply', 'writeoff', 'move', 'sale', 'inventory'].includes(body.type)) {
            return NextResponse.json({ error: "Invalid type" }, { status: 400 });
        }
        if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
            return NextResponse.json({ error: "Items are required" }, { status: 400 });
        }

        // 0. Check Period Lock
        const lockError = await checkInventoryLock(db, body.warehouseId, body.date);
        if (lockError) return NextResponse.json({ error: lockError }, { status: 403 });

        const session = client.startSession();
        let result;

        await session.withTransaction(async () => {
            await processTransaction(db, body, session);
        });

        await session.endSession();
        return NextResponse.json({ success: true, id: result }); // ID might be lost in helper, need to return it carefully

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db('giraffe');
        const body = await req.json(); // New data
        const searchParams = req.nextUrl.searchParams;
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const session = client.startSession();
        await session.withTransaction(async () => {
            // 1. Get Old Document
            const oldDoc = await db.collection("stock_movements").findOne({ _id: new ObjectId(id) }, { session });
            if (!oldDoc) throw new Error("Document not found");

            // 1.5 Check Period Lock for both OLD and NEW dates/warehouses
            const oldLock = await checkInventoryLock(db, oldDoc.warehouseId, oldDoc.date);
            if (oldLock) throw new Error(`Період заблоковано: ${oldLock}`);

            const newLock = await checkInventoryLock(db, body.warehouseId, body.date);
            if (newLock) throw new Error(`Нова дата заблокована: ${newLock}`);

            // 2. Revert Old Balances
            await revertBalances(db, oldDoc, session);

            // 3. Update Document
            // 3. Update Document
            const updateDoc: any = {
                date: new Date(body.date),
                warehouseId: body.warehouseId,
                toWarehouseId: body.toWarehouseId,
                supplierId: body.supplierId,
                items: body.items,
                totalCost: body.totalCost || 0,
                paymentStatus: body.paymentStatus || 'unpaid',
                paidAmount: body.paidAmount || 0,
                description: body.description || "",
                // Preserve or update new fields
                paymentMethod: body.paymentMethod || oldDoc.paymentMethod,
                moneyAccountId: body.moneyAccountId || oldDoc.moneyAccountId,
                updatedAt: new Date()
            };

            await db.collection("stock_movements").updateOne(
                { _id: new ObjectId(id) },
                { $set: updateDoc },
                { session }
            );

            // 4. Apply New Balances
            // We reconstruct the 'body' for processTransaction helper, ensuring type is preserved
            const newTransactionData = { ...updateDoc, type: oldDoc.type };
            await applyBalances(db, newTransactionData, session);
        });

        await session.endSession();
        return NextResponse.json({ success: true });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db('giraffe');
        const searchParams = req.nextUrl.searchParams;
        const id = searchParams.get("id");
        const restore = searchParams.get("restore"); // ?restore=true

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const session = client.startSession();
        await session.withTransaction(async () => {
            const doc = await db.collection("stock_movements").findOne({ _id: new ObjectId(id) }, { session });
            if (!doc) throw new Error("Document not found");

            // Check Period Lock
            const lock = await checkInventoryLock(db, doc.warehouseId, doc.date);
            if (lock) throw new Error(`Період заблоковано інвентаризацією: ${lock}`);

            if (restore === 'true') {
                // RESTORE: Apply balances again, set isDeleted = false
                if (!doc.isDeleted) return; // Already active

                await applyBalances(db, doc, session);
                await db.collection("stock_movements").updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { isDeleted: false, updatedAt: new Date() } },
                    { session }
                );
            } else {
                // DELETE: Revert balances, set isDeleted = true
                if (doc.isDeleted) return; // Already deleted

                await revertBalances(db, doc, session);
                await db.collection("stock_movements").updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { isDeleted: true, updatedAt: new Date() } },
                    { session }
                );
            }
        });

        await session.endSession();
        return NextResponse.json({ success: true });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}


// --- Helper Functions ---

async function processTransaction(db: any, body: any, session: any) {
    // 0.5 Find Active Shift
    const activeShift = await db.collection("cash_shifts").findOne({ status: "open" }, { session });

    // 1. Create Movement Record
    const movementDoc = {
        type: body.type,
        date: new Date(body.date || new Date()),
        warehouseId: body.warehouseId,
        toWarehouseId: body.toWarehouseId,
        supplierId: body.supplierId,
        items: body.items,
        totalCost: body.totalCost || 0,
        paymentStatus: body.paymentStatus || 'unpaid',
        paidAmount: body.paidAmount || 0,
        description: body.description || "",
        paymentMethod: body.paymentMethod, // Save to DB
        moneyAccountId: body.moneyAccountId, // Save to DB
        shiftId: activeShift ? activeShift._id : null,
        createdAt: new Date(),
        isDeleted: false
    };

    const insertRes = await db.collection("stock_movements").insertOne(movementDoc, { session });

    // 2. Apply Balances
    const applied = await applyBalances(db, body, session);

    return insertRes.insertedId;
}

// Logic to APPLY stock changes
async function applyBalances(db: any, data: any, session: any) {
    for (const item of data.items) {
        const qty = parseFloat(item.qty);
        const cost = parseFloat(item.cost || 0);

        if (data.type === 'supply') {
            await db.collection("stock_balances").updateOne(
                { warehouseId: data.warehouseId, itemId: item.itemId },
                {
                    $inc: { quantity: qty },
                    $set: {
                        itemName: item.itemName,
                        unit: item.unit,
                        lastCost: cost, // Update last cost only on supply
                        updatedAt: new Date()
                    }
                },
                { upsert: true, session }
            );
        } else if (data.type === 'writeoff' || data.type === 'sale') {
            await db.collection("stock_balances").updateOne(
                { warehouseId: data.warehouseId, itemId: item.itemId },
                { $inc: { quantity: -qty }, $set: { updatedAt: new Date() } },
                { upsert: true, session }
            );
        } else if (data.type === 'move') {
            await db.collection("stock_balances").updateOne(
                { warehouseId: data.warehouseId, itemId: item.itemId },
                { $inc: { quantity: -qty }, $set: { updatedAt: new Date() } },
                { upsert: true, session }
            );
            await db.collection("stock_balances").updateOne(
                { warehouseId: data.toWarehouseId, itemId: item.itemId },
                {
                    $inc: { quantity: qty },
                    $set: { itemName: item.itemName, unit: item.unit, updatedAt: new Date() }
                },
                { upsert: true, session }
            );
        } else if (data.type === 'inventory') {
            // For inventory, qty is the DELTA (Actual - Theoretical)
            await db.collection("stock_balances").updateOne(
                { warehouseId: data.warehouseId, itemId: item.itemId },
                {
                    $inc: { quantity: qty },
                    $set: {
                        itemName: item.itemName,
                        unit: item.unit,
                        updatedAt: new Date(),
                        // Store the last inventory metadata if needed
                        lastInventoryDate: new Date(data.date),
                        lastInventoryQty: item.actualQty // If provided 
                    }
                },
                { upsert: true, session }
            );
        }
    }
}

// Logic to REVERT stock changes (Exactly inverse of apply)
async function revertBalances(db: any, data: any, session: any) {
    for (const item of data.items) {
        const qty = parseFloat(item.qty);

        if (data.type === 'supply') {
            // Revert Supply: Decrease Balance
            await db.collection("stock_balances").updateOne(
                { warehouseId: data.warehouseId, itemId: item.itemId },
                { $inc: { quantity: -qty } },
                { session }
            );
        } else if (data.type === 'writeoff' || data.type === 'sale') {
            // Revert Writeoff/Sale: Increase Balance
            await db.collection("stock_balances").updateOne(
                { warehouseId: data.warehouseId, itemId: item.itemId },
                { $inc: { quantity: qty } },
                { session }
            );
        } else if (data.type === 'move') {
            // Revert Move: Increase Source, Decrease Target
            await db.collection("stock_balances").updateOne(
                { warehouseId: data.warehouseId, itemId: item.itemId },
                { $inc: { quantity: qty } },
                { session }
            );
            await db.collection("stock_balances").updateOne(
                { warehouseId: data.toWarehouseId, itemId: item.itemId },
                { $inc: { quantity: -qty } },
                { session }
            );
        } else if (data.type === 'inventory') {
            await db.collection("stock_balances").updateOne(
                { warehouseId: data.warehouseId, itemId: item.itemId },
                { $inc: { quantity: -qty } }, // Revert delta
                { session }
            );
        }
    }
}

async function checkInventoryLock(db: any, warehouseId: string, date: any) {
    if (!warehouseId || !date) return null;
    const docDate = new Date(date);

    // Find the latest inventory for this warehouse
    const lastInventory = await db.collection("stock_movements").findOne(
        {
            warehouseId,
            type: 'inventory',
            isDeleted: { $ne: true }
        },
        { sort: { date: -1 } }
    );

    if (lastInventory && docDate <= new Date(lastInventory.date)) {
        return `Дата (${docDate.toLocaleDateString()}) заблокована останньою інвентаризацією від ${new Date(lastInventory.date).toLocaleDateString()}`;
    }

    return null;
}
