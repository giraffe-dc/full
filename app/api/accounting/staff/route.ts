import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours} год ${minutes} хв`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const client = await clientPromise;
    const db = client.db("giraffe");

    // Time filter
    let dateFilter: any = {};
    let logsFilter: any = {};
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate + 'T23:59:59.999Z') : new Date(); // End of day

      dateFilter.createdAt = { $gte: start.toISOString(), $lte: end.toISOString() };

      // For logs: either startTime or endTime falls within range, or covers range
      // Simplified: startTime <= end AND (endTime >= start OR endTime is null)
      logsFilter = {
        startTime: { $lte: end },
        $or: [
          { endTime: { $gte: start } },
          { endTime: null }
        ]
      };
    }

    // 1. Fetch all staff members
    const staffRaw = await db.collection("staff").find({ status: { $ne: "inactive" } }).toArray();

    // 2. Fetch receipts to calculate stats per waiter (Filtered)
    const receiptsFilter = {
      waiter: { $exists: true, $ne: null },
      ...dateFilter
    };
    const receipts = await db.collection("receipts").find(receiptsFilter).toArray();

    // 3. Fetch staff logs for time tracking (Filtered)
    const staffLogs = await db.collection("staff_logs").find(logsFilter).toArray();

    // Parse filter dates for precise duration calc
    const filterStart = startDate ? new Date(startDate).getTime() : 0;
    const filterEnd = endDate ? new Date(endDate + 'T23:59:59.999Z').getTime() : Date.now();

    const staff = staffRaw.map(s => {
      const sName = s.name;
      const sId = s._id.toString();

      // Filter receipts for this waiter
      const sReceipts = receipts.filter(r => r.waiter === sName);

      // Financials
      const revenue = sReceipts.reduce((sum, r) => sum + r.total, 0);
      const profit = revenue; // Simplified
      const receiptsCount = sReceipts.length;
      const avgCheck = receiptsCount > 0 ? revenue / receiptsCount : 0;

      // Time calculations
      const sLogs = staffLogs.filter(l => l.staffId === sId);
      let totalTimeMs = 0;

      sLogs.forEach(log => {
        if (log.startTime) {
          const logStart = new Date(log.startTime).getTime();
          const logEnd = log.endTime ? new Date(log.endTime).getTime() : Date.now();

          // Intersection with filter range
          const calcStart = Math.max(logStart, filterStart);
          const calcEnd = Math.min(logEnd, filterEnd);

          if (calcEnd > calcStart) {
            totalTimeMs += (calcEnd - calcStart);
          }
        }
      });

      const workedTime = formatDuration(totalTimeMs);
      // Avg time per shift (session)
      const avgTimeMs = sLogs.length > 0 ? totalTimeMs / sLogs.length : 0;
      const avgTime = formatDuration(avgTimeMs);

      return {
        id: sId,
        name: s.name,
        position: s.position || "Офіціант",
        phone: s.phone || "",
        email: s.email || "",
        status: s.status || 'active',
        salary: s.salary || 0,
        revenue,
        profit,
        receipts: receiptsCount,
        avgCheck,
        workedTime,
        avgTime
      };
    });

    // Calculate Totals
    const totals = staff.reduce((acc, s) => ({
      revenue: acc.revenue + s.revenue,
      profit: acc.profit + s.profit,
      receipts: acc.receipts + s.receipts
    }), { revenue: 0, profit: 0, receipts: 0 });

    return NextResponse.json({ data: staff, totals });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Keeping POST for redundancy, but UI won't use it in Accounting section
  return NextResponse.json({ error: "Use /staff page to manage staff" }, { status: 400 });
}
