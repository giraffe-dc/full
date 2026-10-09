import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { isPriceSyncEnabled, syncAllIngredientPrices } from "@/lib/stock-utils";

// Одною транзакцією на прод-обсязі (~1200+ чеків) не вистачає ліміту 60с
// (виявлено e2e на копії проду 09.10.2026) → перебудова sale-рухів чанками.
const RECEIPTS_PER_TXN = 200;

export async function POST() {
    try {
        const client = await clientPromise;
        const db = client.db("giraffe");

        // ============ Підготовка (поза транзакціями) ============
        console.log("[RECALCULATE] Fetching receipts & warehouses...");
        const receipts = await db.collection("receipts").find({}).toArray();
        const allWarehouses = await db.collection("warehouses").find({ status: { $ne: 'inactive' } }).toArray();
        const ingredientsWarehouse = allWarehouses.find(w => w.name.toLowerCase().includes('інгредієнти')) || allWarehouses[0];
        const productsWarehouse = allWarehouses.find(w => w.name.toLowerCase().includes('товари')) || allWarehouses[0];
        console.log("[RECALCULATE] Processing receipts:", receipts.length);

        // ============ Phase 1: перебудова sale-рухів ЧАНКАМИ ============
        for (let i = 0; i < receipts.length; i += RECEIPTS_PER_TXN) {
            const chunk = receipts.slice(i, i + RECEIPTS_PER_TXN);
            const session = client.startSession();
            try {
                await session.withTransaction(async () => {
                    // 1. Видалити старі sale-рухи цього чанку (за referenceId)
                    const chunkIds = chunk.map(r => r._id);
                    await db.collection("stock_movements").deleteMany(
                        { type: "sale", referenceId: { $in: chunkIds } },
                        { session }
                    );

                    // 2. Перестворити sale-рухи з чеків чанку
                    for (const receipt of chunk) {
                        const items = receipt.items || [];
                        const receiptId = receipt._id;
                        // PRICE SYNC (P16): дату sale-руху беремо з чека, а не лише createdAt
                        const receiptDate = receipt.date || receipt.createdAt || new Date();

                        for (const item of items) {
                            if (!item.productId) continue;

                            let product: any = null;
                            let recipe: any = null;

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

                                    let targetWH = ingredientsWarehouse;
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
                });
                console.log(`[RECALCULATE] Chunk ${Math.floor(i / RECEIPTS_PER_TXN) + 1}: receipts ${i + 1}-${i + chunk.length} done`);
            } finally {
                await session.endSession();
            }
        }

        // ============ Phase 2: сироти-продажі + перезбірка кешу balances ============
        console.log("[RECALCULATE] Orphan sweep + syncing stock_balances...");
        const session = client.startSession();
        try {
            await session.withTransaction(async () => {
                // Sale-рухи без відповідного чека (як оригінал: видалялись усі sale і будувались заново)
                const allReceiptIds = receipts.map(r => r._id);
                await db.collection("stock_movements").deleteMany(
                    { type: "sale", referenceId: { $nin: allReceiptIds } },
                    { session }
                );

                // Clear existing balances to avoid stale data
                await db.collection("stock_balances").deleteMany({}, { session });

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
                            history: { $push: "$movements" }
                        }
                    },
                    // PRICE SYNC (P7): lastCost лише з supply — $$REMOVE у $last не працює,
                    // тому $filter + $last після групування (як у balances route)
                    ...(isPriceSyncEnabled() ? [
                        { $addFields: { supplyHistory: { $filter: { input: "$history", as: "h", cond: { $eq: ["$$h.type", "supply"] } } } } },
                        { $addFields: { lastCostObj: { $cond: [{ $gt: [{ $size: "$supplyHistory" }, 0] }, { $last: "$supplyHistory" }, null] } } }
                    ] : []),
                    {
                        $addFields: {
                            lastCost: { $last: "$history.cost" },
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
                    const balanceDocs = freshBalances.map((b: any) => ({
                        warehouseId: b._id.warehouseId,
                        itemId: b._id.itemId,
                        itemName: b.itemName,
                        unit: b.unit,
                        quantity: b.quantity,
                        // PRICE SYNC: з flag ON — ціна останнього supply-руху (не sale з cost:0)
                        lastCost: isPriceSyncEnabled()
                            ? (b.lastCostObj ? b.lastCostObj.cost : null)
                            : b.lastCost,
                        updatedAt: new Date()
                    }));
                    await db.collection("stock_balances").insertMany(balanceDocs, { session });
                }
            });
        } finally {
            await session.endSession();
        }

        // PRICE SYNC (Этап 5): поза транзакціями — синхронізація цін усіх
        // інгредієнтів (WMA по активних supply) + каскад у техкарти.
        // Виконується ДО відправки відповіді (на Vercel після return виконання
        // serverless-функції може бути завершене). Помилка — non-fatal.
        if (isPriceSyncEnabled()) {
            try {
                await syncAllIngredientPrices(db);
            } catch (e: any) {
                console.warn('[PRICE_SYNC] Price sync after recalculate failed (non-fatal):', e?.message);
            }
        }

        return NextResponse.json({ success: true, message: "Recalculation complete" });
    } catch (error: any) {
        console.error("Recalculation error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
