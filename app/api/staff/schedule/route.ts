import { NextResponse, NextRequest } from "next/server";
import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

// GET /api/staff/schedule - Get all staff schedules
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const staffId = searchParams.get("staffId");

    const client = await clientPromise;
    const db = client.db();
    
    let query: any = {};

    if (staffId) {
      query.staffId = new ObjectId(staffId);
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate + "T00:00:00.000Z");
      if (endDate) query.date.$lte = new Date(endDate + "T23:59:59.999Z");
    }

    const schedules = await db.collection("staff_schedule").find(query).sort({ date: 1, startTime: 1 }).toArray();
    
    // Enrich with staff info
    const staffIds = [...new Set(schedules.map((s: any) => s.staffId.toString()))];
    const staffMembers = await db.collection("staff").find({
      _id: { $in: staffIds.map(id => new ObjectId(id)) }
    }).toArray();
    
    const staffMap = new Map(staffMembers.map((s: any) => [s._id.toString(), s]));
    
    const enrichedSchedules = schedules.map((s: any) => ({
      ...s,
      _id: s._id.toString(),
      staffId: s.staffId.toString(),
      staff: staffMap.get(s.staffId.toString()) ? {
        _id: staffMap.get(s.staffId.toString())._id.toString(),
        name: staffMap.get(s.staffId.toString()).name,
        position: staffMap.get(s.staffId.toString()).position,
        status: staffMap.get(s.staffId.toString()).status,
      } : undefined,
    }));

    return NextResponse.json({ data: enrichedSchedules });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
