import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db("giraffe");

        // Aggregate: find the most recent supply per itemId
        const pipeline = [
            { $match: { type: "supply", isDeleted: { $ne: true } } },
            { $unwind: "$items" },
            { $sort: { date: -1 as const } },
            {
                $group: {
                    _id: "$items.itemId",
                    cost: { $first: "$items.cost" },
                    qty: { $first: "$items.qty" },
                    date: { $first: "$date" },
                    supplierId: { $first: "$supplierId" },
                },
            },
        ];

        const results = await db
            .collection("stock_movements")
            .aggregate(pipeline)
            .toArray();

        // Fetch supplier names for context
        const supplierIds = [
            ...new Set(results.map((r) => r.supplierId).filter(Boolean)),
        ];
        const suppliers =
            supplierIds.length > 0
                ? await db
                    .collection("stock_suppliers")
                    .find({ _id: { $in: supplierIds.map((id) => { try { return new ObjectId(id); } catch { return id; } }) } })
                    .toArray()
                : [];

        const supplierMap = new Map(
            suppliers.map((s: any) => [s._id.toString(), s.name])
        );

        // Build a simple map: itemId -> { cost, date, supplierName }
        const priceMap: Record<
            string,
            { cost: number; date: string; supplierName: string }
        > = {};

        for (const r of results) {
            priceMap[r._id] = {
                cost: r.cost || 0,
                date: r.date,
                supplierName: supplierMap.get(r.supplierId) || "",
            };
        }

        return NextResponse.json({ data: priceMap });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
