import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb";
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

        const client = await clientPromise;
        const db = client.db("giraffe");

        // Fetch the single settings document. Assuming we only have one for now.
        // In a SaaS, this would be filtered by tenant/user if architecture differed.
        // Here we can use a fixed ID or just findOne.
        const settings = await db.collection("settings").findOne({ type: "global" });

        return NextResponse.json({ data: settings || {} });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromReq(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { finance } = body;

        const client = await clientPromise;
        const db = client.db("giraffe");

        // Upsert the settings document
        await db.collection("settings").updateOne(
            { type: "global" },
            {
                $set: {
                    type: "global",
                    updatedAt: new Date(),
                    ...(finance ? { finance } : {})
                }
            },
            { upsert: true }
        );

        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
