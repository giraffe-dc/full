import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST() {
    try {
        const client = await clientPromise;
        const db = client.db("giraffe");
        const session = client.startSession();

        try {
            await session.withTransaction(async () => {
                // 1. Delete all stock_movements of type 'sale'
                console.log("[RECALCULATE] Deleting old sale movements...");
                await db.collection("stock_movements").deleteMany({ type: "sale" }, { session });

                // 2. Fetch all Receipts
                console.log("[RECALCULATE] Fetching receipts...");
                const receipts = await db.collection("receipts").find({}, { session }).toArray();

                // 3. Fetch all Warehouses
                const allWarehouses = await db.collection("warehouses").find({ status: { $ne: 'inactive' } }, { session }).toArray();
                const ingredientsWarehouse = allWarehouses.find(w => w.name.toLowerCase().includes('інгредієнти')) || allWarehouses[0];
                const productsWarehouse = allWarehouses.find(w => w.name.toLowerCase().includes('товари')) || allWarehouses[0];

                console.log("[RECALCULATE] Processing receipts:", receipts.length);

                for (const receipt of receipts) {
                    const items = receipt.items || [];
                    const receiptId = receipt._id;
                    const receiptDate = receipt.createdAt || new Date();

                    for (const item of items) {
                        if (!item.productId) continue;

                        let product: any = null;
                        let recipe: any = null;

                        // Resolve IDs like in checkout logic
                        const query = ObjectId.isValid(item.productId)
                            ? { $or: [{ _id: new ObjectId(item.productId) }, { id: item.productId }] }
                            : { id: item.productId };

                        product = await db.collection("products").findOne(query, { session });
                        if (!product) {
                            recipe = await db.collection("recipes").findOne(query, { session });
                        }
                        if (!product && !recipe) {
                            product = await db.collection("ingredients").findOne(query, { session });
                        }

                        if (product && !recipe) {
                            recipe = await db.collection("recipes").findOne(
                                { name: product.name, status: { $ne: 'inactive' } },
                                { session }
                            );
                        }

                        if (recipe && recipe.ingredients && recipe.ingredients.length > 0) {
                            // Tech card logic
                            for (const ing of recipe.ingredients) {
                                const qtyToDeduct = (ing.gross || ing.net) * item.quantity;
                                if (qtyToDeduct <= 0) continue;

                                const realIng = await db.collection("ingredients").findOne(
                                    { $or: [{ id: ing.id }, { name: ing.name }] },
                                    { session }
                                );
                                const ingId = realIng ? realIng._id.toString() : ing.id;
                                const ingName = realIng ? realIng.name : ing.name;
                                const ingUnit = realIng ? realIng.unit : (ing.unit || 'г');

                                // Find best warehouse
                                let targetWH = ingredientsWarehouse;
                                // During recalculation, we search for existing balances (from supply/inventory)
                                const existingBalance = await db.collection("stock_balances").findOne(
                                    { itemId: ingId, quantity: { $gt: 0 } },
                                    { session }
                                );
                                if (existingBalance) {
                                    targetWH = allWarehouses.find(w => w._id.toString() === existingBalance.warehouseId) || ingredientsWarehouse;
                                }

                                await db.collection("stock_movements").insertOne({
                                    type: "sale",
                                    date: receiptDate,
                                    warehouseId: targetWH._id.toString(),
                                    items: [{
                                        itemId: ingId,
                                        itemName: ingName,
                                        qty: qtyToDeduct,
                                        unit: ingUnit,
                                        cost: 0
                                    }],
                                    description: `Продаж: Чек #${receipt.receiptNumber} (перераховано)`,
                                    referenceId: receiptId,
                                    isDeleted: false,
                                    createdAt: new Date()
                                }, { session });
                            }
                        } else if (product || recipe) {
                            // Direct deduction
                            const targetItem = product || recipe;
                            const itemId = targetItem._id.toString();
                            const itemName = targetItem.name;
                            const unit = targetItem.unit || 'шт';
                            const qtyToDeduct = item.quantity;

                            let targetWH = productsWarehouse;
                            const existingBalance = await db.collection("stock_balances").findOne(
                                { itemId: itemId, quantity: { $gt: 0 } },
                                { session }
                            );
                            if (existingBalance) {
                                targetWH = allWarehouses.find(w => w._id.toString() === existingBalance.warehouseId) || productsWarehouse;
                            }

                            await db.collection("stock_movements").insertOne({
                                type: "sale",
                                date: receiptDate,
                                warehouseId: targetWH._id.toString(),
                                items: [{
                                    itemId: itemId,
                                    itemName: itemName,
                                    qty: qtyToDeduct,
                                    unit: unit,
                                    cost: 0
                                }],
                                description: `Продаж: Чек #${receipt.receiptNumber} (перераховано)`,
                                referenceId: receiptId,
                                isDeleted: false,
                                createdAt: new Date()
                            }, { session });
                        }
                    }
                }

                // 4. Update stock_balances collection based on new movements
                console.log("[RECALCULATE] Syncing stock_balances collection...");

                // Clear existing balances to avoid stale data
                await db.collection("stock_balances").deleteMany({}, { session });

                // Run aggregation to get fresh balances from history
                const aggregation: any[] = [
                    { $match: { isDeleted: { $ne: true } } },
                    { $unwind: "$items" },
                    {
                        $project: {
                            type: 1,
                            date: 1,
                            warehouseId: { $toString: "$warehouseId" },
                            toWarehouseId: { $toString: "$toWarehouseId" },
                            itemId: { $toString: "$items.itemId" },
                            itemName: "$items.itemName",
                            unit: "$items.unit",
                            qty: { $toDouble: "$items.qty" },
                            actualQty: { $toDouble: { $ifNull: ["$items.actualQty", "$items.qty"] } },
                            cost: { $toDouble: { $ifNull: ["$items.lastCost", { $ifNull: ["$items.cost", 0] }] } }
                        }
                    },
                    {
                        $project: {
                            movements: [
                                {
                                    warehouseId: "$warehouseId",
                                    itemId: "$itemId",
                                    itemName: "$itemName",
                                    unit: "$unit",
                                    date: "$date",
                                    cost: "$cost",
                                    type: "$type",
                                    qty: "$qty",
                                    actualQty: "$actualQty",
                                    change: {
                                        $switch: {
                                            branches: [
                                                { case: { $eq: ["$type", "supply"] }, then: "$qty" },
                                                { case: { $eq: ["$type", "writeoff"] }, then: { $multiply: ["$qty", -1] } },
                                                { case: { $eq: ["$type", "sale"] }, then: { $multiply: ["$qty", -1] } },
                                                { case: { $eq: ["$type", "move"] }, then: { $multiply: ["$qty", -1] } },
                                                { case: { $eq: ["$type", "inventory"] }, then: 0 }
                                            ],
                                            default: 0
                                        }
                                    }
                                },
                                {
                                    warehouseId: "$toWarehouseId",
                                    itemId: "$itemId",
                                    itemName: "$itemName",
                                    unit: "$unit",
                                    date: "$date",
                                    cost: "$cost",
                                    type: "move_in",
                                    qty: "$qty",
                                    actualQty: "$actualQty",
                                    change: { $cond: [{ $eq: ["$type", "move"] }, "$qty", 0] }
                                }
                            ]
                        }
                    },
                    { $unwind: "$movements" },
                    { $match: { "movements.warehouseId": { $ne: null } } },
                    { $sort: { "movements.date": 1 } },
                    {
                        $group: {
                            _id: {
                                warehouseId: "$movements.warehouseId",
                                itemId: "$movements.itemId"
                            },
                            itemName: { $first: "$movements.itemName" },
                            unit: { $first: "$movements.unit" },
                            lastCost: { $last: "$movements.cost" },
                            history: { $push: "$movements" }
                        }
                    },
                    {
                        $addFields: {
                            quantity: {
                                $reduce: {
                                    input: "$history",
                                    initialValue: 0,
                                    in: {
                                        $cond: [
                                            { $eq: ["$$this.type", "inventory"] },
                                            "$$this.actualQty",
                                            { $add: ["$$value", "$$this.change"] }
                                        ]
                                    }
                                }
                            }
                        }
                    }
                ];

                const freshBalances = await db.collection("stock_movements").aggregate(aggregation, { session }).toArray();

                if (freshBalances.length > 0) {
                    const balanceDocs = freshBalances.map(b => ({
                        warehouseId: b._id.warehouseId,
                        itemId: b._id.itemId,
                        itemName: b.itemName,
                        unit: b.unit,
                        quantity: b.quantity,
                        lastCost: b.lastCost,
                        updatedAt: new Date()
                    }));
                    await db.collection("stock_balances").insertMany(balanceDocs, { session });
                }
            });

            return NextResponse.json({ success: true, message: "Recalculation complete" });
        } catch (e) {
            console.error("Recalculation error:", e);
            throw e;
        } finally {
            await session.endSession();
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
