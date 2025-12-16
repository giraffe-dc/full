import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

function formatDuration(ms: number): string {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} год ${minutes} хв`;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const client = await clientPromise;
        const db = client.db("giraffe");

        // Validate ID
        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid staff ID" }, { status: 400 });
        }

        // 1. Get Staff Info (to get the name for receipt filtering)
        const staffMember = await db.collection("staff").findOne({ _id: new ObjectId(id) });
        if (!staffMember) {
            return NextResponse.json({ error: "Staff not found" }, { status: 404 });
        }

        // Date Filters
        const start = startDate ? new Date(startDate) : new Date(0);
        const end = endDate ? new Date(endDate + 'T23:59:59.999Z') : new Date();

        // 2. Fetch Shifts (staff_logs)
        const logsFilter = {
            staffId: id,
            startTime: { $lte: end },
            $or: [
                { endTime: { $gte: start } },
                { endTime: null }
            ]
        };
        const logs = await db.collection("staff_logs").find(logsFilter).sort({ startTime: -1 }).toArray();

        const shifts = logs.map(log => {
            const s = new Date(log.startTime);
            const e = log.endTime ? new Date(log.endTime) : null;

            // Calculate duration intersecting with filter
            const filterStartMs = start.getTime();
            const filterEndMs = end.getTime();
            const logStartMs = s.getTime();
            const logEndMs = e ? e.getTime() : Date.now();

            const calcStart = Math.max(logStartMs, filterStartMs);
            const calcEnd = Math.min(logEndMs, filterEndMs);
            let duration = 0;
            if (calcEnd > calcStart) duration = calcEnd - calcStart;

            return {
                id: log._id.toString(),
                startTime: s.toISOString(),
                endTime: e ? e.toISOString() : null,
                duration: formatDuration(duration),
                durationMs: duration,
                status: !e ? 'active' : 'completed'
            };
        });

        // 3. Fetch Receipts
        // A. By direct waiter assignment (waiterId or waiter name)
        const waiterFilter = {
            $and: [
                {
                    $or: [
                        { waiterId: id }, // Match by ID
                        { waiterId: new ObjectId(id) }, // Match by ObjectId (just in case)
                        { waiter: staffMember.name } // Match by Name
                    ]
                },
                { createdAt: { $gte: start.toISOString(), $lte: end.toISOString() } }
            ]
        };
        // const directReceipts = await db.collection("receipts").find(waiterFilter).sort({ createdAt: -1 }).toArray();
        const directReceipts = await db.collection("receipts").find({ waiterId: new ObjectId(id) }).sort({ createdAt: -1 }).toArray();

        // console.log(directReceipts1);

        // B. By Shift (Cashier Fallback) - If staff was the cashier, they might own the receipts
        // Find shifts where this staff was cashier within the date range
        const shiftFilter = {
            cashierId: id,
            // Optimization: Only look for shifts that overlap with the date range
            // But strict overlap might be complex, let's just use createdAt roughly or rely on receipt date filtering
            // Actually, simpler: Get ALL shift IDs for this cashier, then filter receipts by date AND shiftId
        };
        // Fetch matching shifts (limit to recent/relevant range if possible, but for now simple)
        // To avoid scanning all shifts, we add a date hint
        const shiftsAsCashier = await db.collection("cash_shifts").find({
            cashierId: id,
            createdAt: { $gte: start, $lte: end } // Shift started in range
        }).project({ _id: 1 }).toArray();

        const shiftIds = shiftsAsCashier.map(s => s._id);

        let shiftReceipts: any[] = [];
        if (shiftIds.length > 0) {
            shiftReceipts = await db.collection("receipts").find({
                shiftId: { $in: shiftIds },
                createdAt: { $gte: start.toISOString(), $lte: end.toISOString() }
            }).toArray();
        }

        // Merge and Deduplicate
        const allReceiptsMap = new Map();
        [...directReceipts, ...shiftReceipts].forEach(r => {
            allReceiptsMap.set(r._id.toString(), r);
        });

        const sortedReceipts = Array.from(allReceiptsMap.values())
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const receipts = sortedReceipts.map(r => ({
            id: r._id.toString(),
            number: r.receiptNumber,
            date: r.createdAt,
            total: r.total,
            discount: r.discount || 0,
            paymentMethod: r.paymentMethod,
            itemsCount: r.items ? r.items.length : 0
        }));

        // 4. Calculate Stats
        const totalRevenue = receipts.reduce((sum, r) => sum + r.total, 0);
        const totalWorkedMs = shifts.reduce((sum, s) => sum + s.durationMs, 0);

        return NextResponse.json({
            staff: {
                id: staffMember._id.toString(),
                name: staffMember.name,
                position: staffMember.position,
                phone: staffMember.phone,
                email: staffMember.email,
                salary_rate: staffMember.salary || 0 // Assuming salary is rate per hour or similar, needs clarification but using raw value for now
            },
            shifts,
            receipts,
            stats: {
                totalRevenue,
                checkCount: receipts.length,
                avgCheck: receipts.length ? totalRevenue / receipts.length : 0,
                totalWorkedTime: formatDuration(totalWorkedMs)
            }
        });

    } catch (error) {
        console.error("Staff Details Error:", error);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
