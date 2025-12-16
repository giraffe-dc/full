import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(request: Request) {
    try {
        const client = await clientPromise;
        const db = client.db("giraffe");
        const promotions = await db.collection("promotions").find({}).sort({ createdAt: -1 }).toArray();

        return NextResponse.json({
            success: true,
            data: promotions.map(p => ({ ...p, id: p._id.toString() }))
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch promotions" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Basic validation
        if (!body.name || !body.startDate) {
            return NextResponse.json({ error: "Name and Start Date are required" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db("giraffe");

        const newPromotion = {
            ...body,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true
        };

        const result = await db.collection("promotions").insertOne(newPromotion);

        return NextResponse.json({
            success: true,
            data: { ...newPromotion, id: result.insertedId.toString() }
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create promotion" }, { status: 500 });
    }
}
