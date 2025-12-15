
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../../../../lib/mongodb";

export async function GET(req: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db('giraffe');
        const searchParams = req.nextUrl.searchParams;
        const warehouseId = searchParams.get("warehouseId");

        const query: any = { quantity: { $ne: 0 } }; // Only show non-zero balances by default? Or all?
        if (warehouseId) query.warehouseId = warehouseId;

        // Perform aggregation to lookup item details if needed, 
        // or just return the balance doc and let frontend join.
        // For simplicity, we stored itemName/unit in balance doc during movement update.

        const balances = await db.collection("stock_balances")
            .find(query)
            .sort({ itemName: 1 })
            .toArray();

        return NextResponse.json({ data: balances });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
