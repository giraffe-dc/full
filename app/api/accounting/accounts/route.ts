import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";
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
        const user = await getUserFromReq(req);
        // if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); 
        // Allow public read for now or same as other endpoints

        const client = await clientPromise;
        const db = client.db("giraffe");

        const accounts = await db.collection("money_accounts")
            .find({})
            .sort({ name: 1 })
            .toArray();

        const data = accounts.map(a => ({
            id: a._id.toString(),
            name: a.name,
            type: a.type || 'cash',
            balance: a.balance || 0,
            currency: a.currency || 'UAH',
            description: a.description || '',
            status: a.status || 'active'
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

        const { name, type, balance, description, currency } = await req.json();

        if (!name || !type) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db("giraffe");

        const newAccount = {
            name,
            type, // 'cash', 'card', 'bank'
            balance: Number(balance) || 0,
            currency: currency || 'UAH',
            description: description || '',
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await db.collection("money_accounts").insertOne(newAccount);

        return NextResponse.json({ ok: true, id: result.insertedId });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
