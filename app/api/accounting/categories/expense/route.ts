import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

async function getUserFromReq(req: NextRequest) {
    const token = req.cookies.get('token')?.value;
    if (!token) return null;
    try {
        const payload = jwt.verify(token, JWT_SECRET) as Record<string, any>;
        return payload;
    } catch (e) {
        return null;
    }
}

export async function GET(req: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db("giraffe");

        const categories = await db.collection("expense_categories")
            .find({})
            .sort({ name: 1 })
            .toArray();

        const data = categories.map(c => ({
            ...c,
            id: c._id.toString(),
            _id: c._id.toString()
        }));

        return NextResponse.json({ data });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromReq(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { name, description, color } = await req.json();

        if (!name) {
            return NextResponse.json({ error: "Missing name" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db("giraffe");

        const newCategory = {
            name,
            description: description || '',
            color: color || '#3182ce',
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await db.collection("expense_categories").insertOne(newCategory);

        return NextResponse.json({ ok: true, id: result.insertedId });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const user = await getUserFromReq(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id, name, description, color, status } = await req.json();

        if (!id || !name) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db("giraffe");

        const updateData = {
            name,
            description: description || '',
            color: color || '#3182ce',
            status: status || 'active',
            updatedAt: new Date()
        };

        await db.collection("expense_categories").updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const user = await getUserFromReq(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const client = await clientPromise;
        const db = client.db("giraffe");

        await db.collection("expense_categories").deleteOne({ _id: new ObjectId(id) });

        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
