
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../../../../lib/mongodb";

export async function GET(req: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db('giraffe');
        const searchParams = req.nextUrl.searchParams;
        const warehouseId = searchParams.get("warehouseId");

        const aggregation: any[] = [
            // 1. Filter out deleted movements
            { $match: { isDeleted: false } },

            // 2. Unwind items to process each separately
            { $unwind: "$items" },

            // 3. Project movement changes for each warehouse
            {
                $project: {
                    type: 1,
                    date: 1,
                    warehouseId: 1,
                    toWarehouseId: 1,
                    itemId: "$items.itemId",
                    itemName: "$items.itemName",
                    unit: "$items.unit",
                    qty: { $toDouble: "$items.qty" },
                    cost: { $toDouble: { $ifNull: ["$items.lastCost", { $ifNull: ["$items.cost", 0] }] } }
                }
            },

            // 4. Create separate entries for source and target warehouses (for moves)
            {
                $project: {
                    movements: [
                        // Primary warehouse change
                        {
                            warehouseId: "$warehouseId",
                            itemId: "$itemId",
                            itemName: "$itemName",
                            unit: "$unit",
                            date: "$date",
                            cost: "$cost",
                            type: "$type",
                            qty: "$qty", // Absolute qty for inventory
                            change: {
                                $switch: {
                                    branches: [
                                        { case: { $eq: ["$type", "supply"] }, then: "$qty" },
                                        { case: { $eq: ["$type", "writeoff"] }, then: { $multiply: ["$qty", -1] } },
                                        { case: { $eq: ["$type", "sale"] }, then: { $multiply: ["$qty", -1] } },
                                        { case: { $eq: ["$type", "move"] }, then: { $multiply: ["$qty", -1] } },
                                        // Inventory is special - handled in reduce
                                        { case: { $eq: ["$type", "inventory"] }, then: 0 }
                                    ],
                                    default: 0
                                }
                            }
                        },
                        // Target warehouse change (only for moves)
                        {
                            warehouseId: "$toWarehouseId",
                            itemId: "$itemId",
                            itemName: "$itemName",
                            unit: "$unit",
                            date: "$date",
                            cost: "$cost",
                            type: "move_in", // custom type for target
                            qty: "$qty",
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

            // 7. Group by warehouse and item, and Accumulate logic
            {
                $group: {
                    _id: {
                        warehouseId: "$movements.warehouseId",
                        itemId: "$movements.itemId"
                    },
                    itemName: { $first: "$movements.itemName" },
                    unit: { $first: "$movements.unit" },
                    lastCost: { $last: "$movements.cost" },
                    // Push all movements to array to reduce them
                    history: { $push: "$movements" }
                }
            },

            // 8. Calculate Balance using $reduce
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
                                    "$$this.qty", // Reset to inventory count
                                    { $add: ["$$value", "$$this.change"] } // Apply change
                                ]
                            }
                        }
                    }
                }
            },

            // 9. Optional filtering by warehouse
            ...(warehouseId ? [{ $match: { "_id.warehouseId": warehouseId } }] : []),

            // 10. Final Sorting
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
            lastCost: b.lastCost
        }));

        return NextResponse.json({ data: formattedBalances });
    } catch (e: any) {
        console.error("Aggregation error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
