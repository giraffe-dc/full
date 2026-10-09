import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../../../../lib/mongodb";
import { isPriceSyncEnabled } from "@/lib/stock-utils";

export async function GET(req: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db('giraffe');
        const searchParams = req.nextUrl.searchParams;
        const warehouseId = searchParams.get("warehouseId");

        // PRICE SYNC (P7): з flag ON lastCost береться ЛИШЕ з supply-рухів, щоб
        // продаж (cost: 0) не обнуляв «останню ціну». З flag OFF — стара поведінка.
        const priceSync = isPriceSyncEnabled();

        // Group stage. lastCost/lastPurchaseCost для flag OFF залишені в $group як раніше;
        // для flag ON вони обчислюються ПІСЛЯ групування (див. $addFields нижче), бо
        // "$$REMOVE" всередині $last-акумулятора не працює (дає null) — виявлено e2e-тестом.
        const groupStage: any = {
            _id: {
                warehouseId: "$movements.warehouseId",
                itemId: "$movements.itemId"
            },
            itemName: { $first: "$movements.itemName" },
            unit: { $first: "$movements.unit" },
            // Push all movements to array to reduce them
            history: { $push: "$movements" }
        };
        if (!priceSync) {
            groupStage.lastCost = { $last: "$movements.cost" };
            groupStage.lastPurchaseCost = {
                $last: {
                    $cond: [
                        { $eq: ["$movements.type", "supply"] },
                        "$movements.cost",
                        "$$REMOVE"
                    ]
                }
            };
        }

        const aggregation: any[] = [
            // 1. Filter out deleted movements
            { $match: { isDeleted: { $ne: true } } },

            // 2. Unwind items to process each separately
            { $unwind: "$items" },

            // 3. Project movement changes for each warehouse
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

            // 4. Create separate entries for source and target warehouses (for moves)
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

            // 5. Filter out entries without a warehouseId (target for non-moves)
            { $match: { "movements.warehouseId": { $ne: null } } },

            // 6. Sort by date ASC to get correct timeline
            { $sort: { "movements.date": 1 } },

            // 7. Group by warehouse and item
            { $group: groupStage },

            // 8. PRICE SYNC: lastCost/lastPurchaseCost лише з supply-рухів (P7)
            ...(priceSync ? [
                { $addFields: { supplyHistory: { $filter: { input: "$history", as: "h", cond: { $eq: ["$$h.type", "supply"] } } } } },
                { $addFields: { lastCostObj: { $cond: [{ $gt: [{ $size: "$supplyHistory" }, 0] }, { $last: "$supplyHistory" }, null] } } }
            ] : []),

            // 9. Calculate Balance using $reduce
            // Logic: If type is 'inventory', RESET balance to qty. Else add 'change'.
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
            },

            // 10. Optional filtering by warehouse
            ...(warehouseId ? [{ $match: { "_id.warehouseId": warehouseId } }] : []),

            // 11. Final Sorting
            { $sort: { itemName: 1 } }
        ];

        const balances = await db.collection("stock_movements").aggregate(aggregation).toArray();

        // Map _id fields back for frontend compatibility
        const formattedBalances = balances.map(b => ({
            _id: `${b._id.warehouseId}_${b._id.itemId}`,
            warehouseId: b._id.warehouseId,
            itemId: b._id.itemId,
            itemName: b.itemName,
            unit: b.unit,
            quantity: b.quantity,
            // PRICE SYNC: з flag ON обидва поля = ціна останнього supply-руху
            lastCost: priceSync ? (b.lastCostObj ? b.lastCostObj.cost : null) : b.lastCost,
            lastPurchaseCost: priceSync ? (b.lastCostObj ? b.lastCostObj.cost : null) : b.lastPurchaseCost
        }));

        return NextResponse.json({ data: formattedBalances });
    } catch (e: any) {
        console.error("Aggregation error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
