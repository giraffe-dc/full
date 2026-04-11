import { NextResponse, NextRequest } from "next/server";
import clientPromise from "../../../../../../lib/mongodb";
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

// PUT /api/staff/schedule/actual/[id] - Edit an actual shift
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized. Admin only." }, { status: 401 });
    }

    const { id } = await params;
    const { date, startTime, endTime, notes } = await req.json();

    if (!date || !startTime || !endTime) {
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

    const result = await db.collection("staff_logs").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          startTime: startDateTime,
          endTime: endDateTime,
          isManualEdit: true, // Marker to persist despite system updates
          notes,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE /api/staff/schedule/actual/[id] - Delete an actual shift
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized. Admin only." }, { status: 401 });
    }

    const { id } = await params;
    const client = await clientPromise;
    const db = client.db("giraffe");

    const result = await db.collection("staff_logs").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
