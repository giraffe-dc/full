import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db("giraffe");

        const data = await db.collection("departments")
            .find({ status: "active" })
            .toArray();

        return NextResponse.json({
            success: true,
            data: data.map(d => ({ ...d, id: d._id.toString() }))
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch departments" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name } = body;

        if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

        const client = await clientPromise;
        const db = client.db("giraffe");

        // Basic icon logic or random
        const icons = ['main_hall', 'terrace', 'vip'];
        const randomIcon = icons[Math.floor(Math.random() * icons.length)];

        const newDept = {
            name,
            icon: randomIcon,
            status: 'active'
        };

        const result = await db.collection("departments").insertOne(newDept);

        return NextResponse.json({
            success: true,
            data: { ...newDept, id: result.insertedId.toString() }
        });

    } catch (error) {
        return NextResponse.json({ error: "Failed to create department" }, { status: 500 });
    }
}
