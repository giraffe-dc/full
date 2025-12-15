
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db('giraffe');

        const warehouses = await db.collection("warehouses")
            .find({ status: { $ne: 'inactive' } }) // Only active
            .sort({ name: 1 })
            .toArray();

        return NextResponse.json({ data: warehouses });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db('giraffe');
        const body = await req.json();

        if (!body.name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const newWarehouse = {
            name: body.name,
            address: body.address || "",
            description: body.description || "",
            status: "active",
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await db.collection("warehouses").insertOne(newWarehouse);

        return NextResponse.json({
            success: true,
            data: { ...newWarehouse, _id: result.insertedId }
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db('giraffe');
        const body = await req.json();
        const { _id, ...updateData } = body;

        if (!_id) {
            return NextResponse.json({ error: "ID is required" }, { status: 400 });
        }

        const result = await db.collection("warehouses").updateOne(
            { _id: new ObjectId(_id) },
            {
                $set: {
                    ...updateData,
                    updatedAt: new Date()
                }
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "ID is required" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db('giraffe');

        // Soft delete
        const result = await db.collection("warehouses").updateOne(
            { _id: new ObjectId(id) },
            { $set: { status: 'inactive', updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
