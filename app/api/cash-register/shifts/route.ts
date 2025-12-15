
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 20;

        const client = await clientPromise;
        const db = client.db("giraffe");

        const filter: any = {};
        if (status) {
            filter.status = status;
        }

        const shifts = await db.collection("cash_shifts")
            .find(filter)
            .sort({ createdAt: -1 }) // Newest first
            .limit(limit)
            .toArray();

        // Convert _id to id
        const data = shifts.map(shift => ({
            ...shift,
            id: shift._id.toString()
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch shifts" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { startBalance, cashier } = body;

        const client = await clientPromise;
        const db = client.db("giraffe");

        // Check if there is already an open shift
        const activeShift = await db.collection("cash_shifts").findOne({ status: "open" });
        if (activeShift) {
            return NextResponse.json({ error: "Shift already open", shiftId: activeShift._id }, { status: 409 });
        }

        // Get last shift number
        const lastShift = await db.collection("cash_shifts").find().sort({ shiftNumber: -1 }).limit(1).next();
        const nextShiftNumber = lastShift ? lastShift.shiftNumber + 1 : 1;

        const newShift = {
            shiftNumber: nextShiftNumber,
            startTime: new Date(),
            startBalance: Number(startBalance) || 0,
            status: "open",
            cashier: cashier || "Default",
            totalSales: 0,
            createdAt: new Date()
        };

        const result = await db.collection("cash_shifts").insertOne(newShift);

        return NextResponse.json({
            success: true,
            data: { ...newShift, id: result.insertedId.toString() }
        });

    } catch (error) {
        return NextResponse.json({ error: "Failed to open shift" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, endBalance } = body;

        if (!id) return NextResponse.json({ error: "Shift ID required" }, { status: 400 });

        const client = await clientPromise;
        const db = client.db("giraffe");

        // Calculate totals from receipts linked to this shift
        // Alternatively, we could rely on the frontend passing totals, but backend calculation is safer.
        // Let's aggregate receipts.

        const receipts = await db.collection("receipts").find({ shiftId: new ObjectId(id) }).toArray();
        const totalSales = receipts.reduce((sum, r) => sum + (r.total || 0), 0);

        // Fetch current shift to get startBalance
        const shift = await db.collection("cash_shifts").findOne({ _id: new ObjectId(id) });
        if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });

        const expectedCash = (shift.startBalance || 0) + totalSales;
        const actualCash = Number(endBalance);
        const cashDifference = actualCash - expectedCash;

        const updateData = {
            status: "closed",
            endTime: new Date(),
            endBalance: actualCash,
            totalSales: totalSales,
            receiptsCount: receipts.length,
            cashDifference: cashDifference,
            updatedAt: new Date()
        };

        await db.collection("cash_shifts").updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        return NextResponse.json({ success: true, data: updateData });

    } catch (error) {
        console.error("Close Shift Error", error);
        return NextResponse.json({ error: "Failed to close shift" }, { status: 500 });
    }
}
