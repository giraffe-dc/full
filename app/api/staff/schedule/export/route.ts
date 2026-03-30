import { NextResponse, NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET /api/staff/schedule/export - Export schedule to Excel format
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

    // Fetch all active staff
    const staff = await db.collection("staff").find({ status: { $ne: "inactive" } }).toArray();

    // Fetch all schedules for the month
    const startDate = new Date(year, monthNum - 1, 1).toISOString().split("T")[0];
    const endDate = new Date(year, monthNum - 1, daysInMonth).toISOString().split("T")[0];

    const schedules = await db.collection("staff_schedule").find({
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    }).toArray();

    // Build export data
    const monthName = new Date(year, monthNum - 1, 1).toLocaleDateString("uk-UA", { month: "long", year: "numeric" });

    const header = {
      month: monthName,
      generatedAt: new Date().toISOString(),
      daysInMonth,
    };

    const columns = [
      { key: "fullName", label: "ПІП" },
      { key: "position", label: "Посада" },
      { key: "salary", label: "Оклад" },
      ...Array.from({ length: daysInMonth }, (_, i) => ({
        key: `day${i + 1}`,
        label: i + 1,
      })),
      { key: "totalShifts", label: "Вихід" },
      { key: "totalHours", label: "Годин" },
    ];

    const rows = staff.map((member: any) => {
      const row: any = {
        fullName: member.name,
        position: member.position || "-",
        salary: member.salary ? `${member.salary} ₴` : "-",
      };

      let totalShifts = 0;
      let totalHours = 0;

      // Fill days
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const shift = schedules.find((s: any) => {
          const sDate = s.date instanceof Date ? s.date.toISOString().split("T")[0] : s.date.split("T")[0];
          return s.staffId.toString() === member._id.toString() && sDate === dateStr;
        });

        if (shift) {
          const [startHour, startMin] = shift.startTime.split(":").map(Number);
          const [endHour, endMin] = shift.endTime.split(":").map(Number);
          const hours = (endHour * 60 + endMin - startHour * 60 - startMin) / 60;
          row[`day${day}`] = Math.round(hours);
          totalShifts++;
          totalHours += hours;
        } else {
          row[`day${day}`] = "";
        }
      }

      row.totalShifts = totalShifts;
      row.totalHours = Math.round(totalHours);

      return row;
    });

    return NextResponse.json({
      success: true,
      data: {
        header,
        columns,
        rows,
      },
    });
  } catch (error) {
    console.error("Error exporting schedule:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
