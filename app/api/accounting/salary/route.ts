import { NextResponse, NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET /api/accounting/salary - Get salary data with hours from schedules
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // Format: YYYY-MM

    if (!month) {
      return NextResponse.json({ error: "Month parameter is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Parse month
    const [year, monthNum] = month.split("-").map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum - 1, daysInMonth);

    // Fetch all active staff
    const staff = await db.collection("staff").find({ status: { $ne: "inactive" } }).toArray();

    // Fetch all schedules for the month
    const schedules = await db.collection("staff_schedule").find({
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    }).toArray();

    // Fetch salary settings (rates by position)
    const salarySettings = await db.collection("salary_settings").find().toArray();
    const rateMap = new Map(salarySettings.map((s: any) => [s.position, s.ratePerHour || 0]));

    // Build salary rows
    const salaryRows = staff.map((member: any) => {
      let totalHours = 0;
      let totalShifts = 0;

      // Calculate hours from schedules
      schedules.forEach((shift: any) => {
        if (shift.staffId.toString() === member._id.toString()) {
          const [startHour, startMin] = shift.startTime.split(":").map(Number);
          const [endHour, endMin] = shift.endTime.split(":").map(Number);
          const hours = (endHour * 60 + endMin - startHour * 60 - startMin) / 60;
          totalHours += hours;
          totalShifts++;
        }
      });

      // Get rate from settings or use default from staff
      const position = member.position || "other";
      const ratePerHour = rateMap.get(position) || member.salaryRate || 50; // Default 50 UAH/hour

      const baseSalary = totalHours * ratePerHour;
      const bonus = member.bonus || 0;
      const fine = member.fine || 0;
      const toPay = baseSalary + bonus - fine;

      return {
        id: member._id.toString(),
        employee: member.name,
        position: position,
        totalHours: Math.round(totalHours),
        totalShifts,
        ratePerHour,
        baseSalary: Math.round(baseSalary),
        bonus,
        fine,
        toPay: Math.round(toPay),
        status: toPay > 0 ? "pending" : "paid",
      };
    });

    return NextResponse.json({
      success: true,
      data: salaryRows,
    });
  } catch (error) {
    console.error("Error fetching salary data:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/accounting/salary - Update salary (bonus/fine)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { staffId, bonus, fine } = body;

    if (!staffId) {
      return NextResponse.json({ error: "staffId is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    await db.collection("staff").updateOne(
      { _id: new ObjectId(staffId) },
      { $set: { bonus: bonus || 0, fine: fine || 0 } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating salary:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
