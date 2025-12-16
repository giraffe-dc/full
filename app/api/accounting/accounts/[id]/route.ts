import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../../../../lib/mongodb";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const user = await getUserFromReq(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { name, type, balance, description, currency, status } = await req.json();
        const client = await clientPromise;
        const db = client.db("giraffe");

        const updateData: any = { updatedAt: new Date() };
        if (name !== undefined) updateData.name = name;
        if (type !== undefined) updateData.type = type;
        if (balance !== undefined) updateData.balance = Number(balance);
        if (description !== undefined) updateData.description = description;
        if (currency !== undefined) updateData.currency = currency;
        if (status !== undefined) updateData.status = status;

        const result = await db
            .collection("money_accounts")
            .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: "Account not found" }, { status: 404 });
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const user = await getUserFromReq(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const client = await clientPromise;
        const db = client.db("giraffe");
        const result = await db
            .collection("money_accounts")
            .deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return NextResponse.json({ error: "Account not found" }, { status: 404 });
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
