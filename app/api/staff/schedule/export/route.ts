import { NextResponse, NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET /api/staff/schedule/export - Export schedule to Excel format
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // Format: YYYY-MM

    const type = searchParams.get("type") || "planned";

    if (!month) {
      return NextResponse.json({ error: "Month parameter is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("giraffe");

    // Parse month
    const [year, monthNum] = month.split("-").map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();

    // Fetch all active staff
    const staff = await db.collection("staff").find({ status: { $ne: "inactive" } }).toArray();

    // Fetch all schedules for the month
    const startDateStr = `${year}-${String(monthNum).padStart(2, "0")}-01`;
    const endDateStr = `${year}-${String(monthNum).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

    let schedules = [];

    if (type === "actual") {
      const logs = await db.collection("staff_logs").find({
        startTime: {
          $gte: new Date(startDateStr + "T00:00:00.000Z"),
          $lte: new Date(endDateStr + "T23:59:59.999Z"),
        },
      }).toArray();

      schedules = logs.map(log => {
        const start = new Date(log.startTime);
        return {
          staffId: new ObjectId(log.staffId),
          date: new Date(start.getFullYear(), start.getMonth(), start.getDate()),
          startTime: `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
          endTime: log.endTime ? `${String(new Date(log.endTime).getHours()).padStart(2, '0')}:${String(new Date(log.endTime).getMinutes()).padStart(2, '0')}` : "Триває"
        };
      });
    } else {
      schedules = await db.collection("staff_schedule").find({
        date: {
          $gte: new Date(startDateStr + "T00:00:00.000Z"),
          $lte: new Date(endDateStr + "T23:59:59.999Z"),
        },
      }).toArray();
    }

    // Build export data
    const monthName = new Date(year, monthNum - 1, 1).toLocaleDateString("uk-UA", { month: "long", year: "numeric" });

    const header = {
      month: monthName,
      generatedAt: new Date().toISOString(),
      daysInMonth,
      type: type === "actual" ? "Фактичний" : "Плановий",
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
      const fullName = [member.lastName, member.name, member.patronymic].filter(Boolean).join(" ") || member.name;
      const row: any = {
        fullName,
        position: member.position || "-",
        salary: member.salary ? `${member.salary} ₴` : "-",
      };

      let totalShifts = 0;
      let totalHours = 0;

      // Fill days
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const dayShifts = schedules.filter((s: any) => {
          const sDate = s.date instanceof Date ? s.date.toISOString().split("T")[0] : s.date.split("T")[0];
          return s.staffId.toString() === member._id.toString() && sDate === dateStr;
        });

        if (dayShifts.length > 0) {
          totalShifts += dayShifts.length;
          let dayHours = 0;
          let hasActive = false;

          dayShifts.forEach((shift: any) => {
            if (shift.endTime === "Триває") {
              hasActive = true;
            } else {
              const [startHour, startMin] = shift.startTime.split(":").map(Number);
              const [endHour, endMin] = shift.endTime.split(":").map(Number);
              
              let diffMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
              if (diffMinutes < 0) diffMinutes += 1440; // Midnight crossover fix
              
              dayHours += diffMinutes / 60;
            }
          });

          if (dayHours > 0) {
            row[`day${day}`] = dayHours % 1 === 0 ? dayHours.toString() : dayHours.toFixed(1);
            totalHours += dayHours;
          } else if (hasActive) {
            row[`day${day}`] = "—";
          } else {
            row[`day${day}`] = "0";
          }
        } else {
          row[`day${day}`] = "";
        }
      }

      row.totalShifts = totalShifts;
      row.totalHours = Number(totalHours.toFixed(1));

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
