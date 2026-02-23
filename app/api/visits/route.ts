import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');

        const client = await clientPromise;
        const db = client.db("giraffe");

        let query: any = {};

        if (startDateParam && endDateParam) {
            const sDate = new Date(startDateParam);
            sDate.setHours(0, 0, 0, 0);
            const eDate = new Date(endDateParam);
            eDate.setHours(23, 59, 59, 999);

            query.date = {
                $gte: sDate.toISOString().split('T')[0],
                $lte: eDate.toISOString().split('T')[0]
            };
        }

        const visits = await db.collection("visits")
            .find(query)
            .sort({ date: -1, startTime: -1 })
            .toArray();

        return NextResponse.json({
            success: true,
            data: visits.map(v => ({ ...v, id: v._id.toString() }))
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to fetch visits" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const client = await clientPromise;
        const db = client.db("giraffe");

        const newVisit = {
            ...body,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const result = await db.collection("visits").insertOne(newVisit);

        return NextResponse.json({
            success: true,
            data: { ...newVisit, id: result.insertedId.toString() }
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to create visit" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json({ error: "ID required" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db("giraffe");

        const result = await db.collection("visits").updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    ...updateData,
                    updatedAt: new Date().toISOString()
                }
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: "Visit not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to update visit" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: "ID required" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db("giraffe");

        const result = await db.collection("visits").deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return NextResponse.json({ error: "Visit not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to delete visit" }, { status: 500 });
    }
}
