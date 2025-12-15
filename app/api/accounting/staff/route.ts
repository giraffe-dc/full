import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours} год ${minutes} хв`;
}

export async function GET(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db("giraffe");

    // 1. Fetch all staff members
    const staffRaw = await db.collection("staff").find({ status: { $ne: "inactive" } }).toArray();

    // 2. Fetch receipts to calculate stats per waiter
    const receipts = await db.collection("receipts").find({ waiter: { $exists: true, $ne: null } }).toArray();

    // 3. Fetch shifts to calculate worked time
    const shifts = await db.collection("cash_shifts").find({
      status: "closed",
      cashier: { $exists: true, $ne: null }
    }).toArray();

    const staff = staffRaw.map(s => {
      const sName = s.name;

      // Filter receipts for this waiter
      const sReceipts = receipts.filter(r => r.waiter === sName);

      // Filter shifts for this cashier
      // Note: 'cashier' in shifts might be 'Admin' or name. We try to match with sName.
      const sShifts = shifts.filter(sh => sh.cashier === sName);

      // Financials
      const revenue = sReceipts.reduce((sum, r) => sum + r.total, 0);
      const profit = revenue; // Simplified
      const receiptsCount = sReceipts.length;
      const avgCheck = receiptsCount > 0 ? revenue / receiptsCount : 0;

      // Time calculations
      let totalTimeMs = 0;
      sShifts.forEach(sh => {
        if (sh.startTime && sh.endTime) {
          const start = new Date(sh.startTime).getTime();
          const end = new Date(sh.endTime).getTime();
          totalTimeMs += (end - start);
        }
      });

      const workedTime = formatDuration(totalTimeMs);
      const avgTimeMs = sShifts.length > 0 ? totalTimeMs / sShifts.length : 0;
      const avgTime = formatDuration(avgTimeMs);

      return {
        id: s._id.toString(),
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
