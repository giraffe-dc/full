import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const departmentId = searchParams.get('departmentId');

        if (!departmentId) {
            return NextResponse.json({ error: "Department ID required" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db("giraffe");

        const data = await db.collection("tables")
            .find({ departmentId: new ObjectId(departmentId) })
            .toArray();

        return NextResponse.json({
            success: true,
            data: data.map(d => ({ ...d, id: d._id.toString() }))
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch tables" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, departmentId } = body;

        if (!name || !departmentId) {
            return NextResponse.json({ error: "Name and Department ID required" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db("giraffe");

        const newTable = {
            name,
            departmentId: new ObjectId(departmentId),
            seats: 0,
            status: 'free',
            x: 0, y: 0 // Default coords
        };

        const result = await db.collection("tables").insertOne(newTable);

        return NextResponse.json({
            success: true,
            data: { ...newTable, id: result.insertedId.toString() }
        });

    } catch (error) {
        return NextResponse.json({ error: "Failed to create table" }, { status: 500 });
    }
}
