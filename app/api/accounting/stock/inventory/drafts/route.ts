import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI || "";
const client = new MongoClient(uri);

async function getDb() {
    await client.connect();
    return client.db("giraffe");
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const warehouseId = searchParams.get('warehouseId');
        const type = searchParams.get('type');

        if (!warehouseId || !type) {
            return NextResponse.json({ error: "Missing warehouseId or type" }, { status: 400 });
        }

        const db = await getDb();
        const draft = await db.collection("stock_inventory_drafts").findOne({
            warehouseId,
            inventoryType: type
        });

        return NextResponse.json({ data: draft });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { warehouseId, inventoryType, items, date } = body;

        if (!warehouseId || !inventoryType) {
            return NextResponse.json({ error: "Missing requirements" }, { status: 400 });
        }

        const db = await getDb();

        // Upsert draft
        await db.collection("stock_inventory_drafts").updateOne(
            { warehouseId, inventoryType },
            {
                $set: {
                    items,
                    date,
                    updatedAt: new Date()
                }
            },
            { upsert: true }
        );

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const warehouseId = searchParams.get('warehouseId');
        const type = searchParams.get('type');

        if (!warehouseId || !type) {
            return NextResponse.json({ error: "Missing warehouseId or type" }, { status: 400 });
        }

        const db = await getDb();
        await db.collection("stock_inventory_drafts").deleteOne({ warehouseId, inventoryType: type });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
