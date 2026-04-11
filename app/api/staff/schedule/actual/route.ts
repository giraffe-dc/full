import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../../../../lib/mongodb";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

async function getUser(req: NextRequest) {
  const token = req.cookies?.get?.("token")?.value ?? null;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as Record<string, any>;
  } catch (e) {
    return null;
  }
}

// POST /api/staff/schedule/actual - Create a new actual shift manually
export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized. Admin only." }, { status: 401 });
    }

    const { staffId, date, startTime, endTime, notes } = await req.json();

    if (!staffId || !date || !startTime || !endTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Parse dates
    const dateObj = new Date(date);
    const [startH, startM] = startTime.split(":");
    const startDateTime = new Date(dateObj);
    startDateTime.setHours(Number(startH), Number(startM), 0, 0);

    const [endH, endM] = endTime.split(":");
    const endDateTime = new Date(dateObj);
    endDateTime.setHours(Number(endH), Number(endM), 0, 0);

    const client = await clientPromise;
    const db = client.db("giraffe");

    const result = await db.collection("staff_logs").insertOne({
      staffId: typeof staffId === 'string' ? staffId : new ObjectId(staffId),
      shiftId: null, // manual shift, no cash register link 
      startTime: startDateTime,
      endTime: endDateTime,
      createdAt: new Date(),
      isManualEdit: true, // Mark it as manually populated
      notes
    });

    return NextResponse.json({ ok: true, id: result.insertedId }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
