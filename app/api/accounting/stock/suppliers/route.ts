
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db('giraffe');

        const suppliers = await db.collection("suppliers")
            .find({ status: { $ne: 'inactive' } }) // Only active
            .sort({ name: 1 })
            .toArray();

        return NextResponse.json({ data: suppliers });
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

        const newSupplier = {
            name: body.name,
            contactName: body.contactName || "",
            phone: body.phone || "",
            email: body.email || "",
            address: body.address || "",
            status: "active",
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await db.collection("suppliers").insertOne(newSupplier);

        return NextResponse.json({
            success: true,
            data: { ...newSupplier, _id: result.insertedId }
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

        const result = await db.collection("suppliers").updateOne(
            { _id: new ObjectId(_id) },
            {
                $set: {
                    ...updateData,
                    updatedAt: new Date()
                }
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
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
        const result = await db.collection("suppliers").updateOne(
            { _id: new ObjectId(id) },
            { $set: { status: 'inactive', updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
