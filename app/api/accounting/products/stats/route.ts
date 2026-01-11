
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../../../../lib/mongodb";

export async function GET(req: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db("giraffe");

        // 1. Fetch all receipts (can filter by date here later)
        // For MVP, fetch all. Optimization: filter fields project.
        const receipts = await db.collection("receipts").find({}).toArray();

        // 2. Fetch products and recipes for fallback info (category, cost)
        const productsRaw = await db.collection("products").find({}).toArray();
        const recipesRaw = await db.collection("recipes").find({}).toArray();

        const allItemsRaw = [...productsRaw, ...recipesRaw];

        const productMap = new Map(allItemsRaw.map(p => [p._id.toString(), p])); // Map by _id
        const productMapById = new Map(allItemsRaw.map(p => [p.id, p])); // Map by id (string)

        // 3. Aggregate
        const statsMap = new Map<string, any>();

        receipts.forEach((r: any) => {
            if (!r.items || !Array.isArray(r.items)) return;

            r.items.forEach((item: any) => {
                // Identifier: Try id, then _id (if strictly typed), or name as fallback
                const id = item.productId || item.id || item.name;

                if (!statsMap.has(id)) {
                    // Find product details
                    let details = productMap.get(id) || productMapById.get(id);
                    // If not found by ID, maybe try finding by name in allItemsRaw?
                    if (!details) {
                        details = allItemsRaw.find(p => p.name === item.name);
                    }

                    statsMap.set(id, {
                        name: item.name || details?.name || "Невідомий товар",
                        id: id,
                        category: details?.category || "Інше",
                        count: 0,
                        grossRevenue: 0,
                        discount: 0,
                        revenue: 0,
                        cost: 0
                    });
                }

                const entry = statsMap.get(id);
                const qty = Number(item.count || item.qty || item.quantity || 0);
                const price = Number(item.price || 0);
                const total = qty * price; // Revenue

                // Cost calculation: 
                // 1. If item has cost (transferred at checkout), use it.
                // 2. Else use current product cost.
                let unitCost = Number(item.cost || 0);
                if (!unitCost) {
                    const details = productMap.get(id) || productMapById.get(id) || allItemsRaw.find(p => p.name === item.name);
                    unitCost = Number(details?.costPerUnit || 0);
                }

                entry.count += qty;
                entry.grossRevenue += total; // Assuming price is gross
                entry.revenue += total; // Deduct discounts if tracked
                entry.cost += (unitCost * qty);
            });
        });

        const rows = Array.from(statsMap.values()).map(entry => ({
            name: entry.name,
            category: entry.category,
            count: entry.count,
            grossRevenue: entry.grossRevenue,
            discount: entry.discount,
            revenue: entry.revenue,
            profit: entry.revenue - entry.cost,
            margin: entry.revenue > 0 ? ((entry.revenue - entry.cost) / entry.revenue) * 100 : 0
        }));

        // Calculate Totals
        const totals = rows.reduce((acc, r) => ({
            count: acc.count + r.count,
            grossRevenue: acc.grossRevenue + r.grossRevenue,
            discount: acc.discount + r.discount,
            revenue: acc.revenue + r.revenue,
            profit: acc.profit + r.profit
        }), { count: 0, grossRevenue: 0, discount: 0, revenue: 0, profit: 0 });

        return NextResponse.json({ data: rows, totals });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
