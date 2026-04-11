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
    const type = searchParams.get("type") || "planned";

    const client = await clientPromise;
    const db = client.db("giraffe");
    
    let query: any = {};

    if (staffId) {
      const orConditions: any[] = [{ staffId: staffId }];
      if (ObjectId.isValid(staffId)) {
        orConditions.push({ staffId: new ObjectId(staffId) });
      }
      query.$or = orConditions;
    }

    if (startDate || endDate) {
      if (type === "actual") {
        query.startTime = {};
        if (startDate) query.startTime.$gte = new Date(startDate + "T00:00:00.000Z");
        if (endDate) query.startTime.$lte = new Date(endDate + "T23:59:59.999Z");
      } else {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate + "T00:00:00.000Z");
        if (endDate) query.date.$lte = new Date(endDate + "T23:59:59.999Z");
      }
    }

    let schedules = [];

    if (type === "actual") {
      const logs = await db.collection("staff_logs").find(query).sort({ startTime: 1 }).toArray();
      schedules = logs.map(log => {
        const start = new Date(log.startTime);
        const end = log.endTime ? new Date(log.endTime) : null;
        
        let endTimeStr = "";
        if (end) {
          endTimeStr = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
        } else {
          endTimeStr = "Триває";
        }

        // Format date string from local components to avoid UTC shift
        const dateStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;

        return {
          _id: log._id,
          staffId: log.staffId.toString(),
          shiftId: log.shiftId,
          date: dateStr,
          startTime: `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
          endTime: endTimeStr,
          isManualEdit: log.isManualEdit || false,
          notes: log.isManualEdit ? "(Редаговано вручну)" : ""
        };
      });
    } else {
      schedules = await db.collection("staff_schedule").find(query).sort({ date: 1, startTime: 1 }).toArray();
    }
    
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
