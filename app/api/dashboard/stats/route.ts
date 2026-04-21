import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(request: Request) {
    try {
        const client = await clientPromise;
        const db = client.db("giraffe");

        // Define today's boundaries
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // Define yesterday's boundaries
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        const yesterdayEnd = new Date(todayEnd);
        yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

        // Helpers
        const calculateTrend = (todayValue: number, yesterdayValue: number) => {
            if (yesterdayValue === 0) return todayValue > 0 ? 100 : 0;
            return Number(((todayValue - yesterdayValue) / yesterdayValue * 100).toFixed(1));
        };

        const getRevenue = async (start: Date, end: Date) => {
            const matches = await db.collection("receipts").find({
                createdAt: { $gte: start, $lte: end }
            }).toArray();
            return matches.reduce((acc, r) => acc + (Number(r.total) || 0), 0);
        };

        const getVisitors = async (start: Date, end: Date) => {
            // Check both createdAt (Date) and createdAt (ISO String)
            const isoStart = start.toISOString();
            const isoEnd = end.toISOString();
            return await db.collection("visits").countDocuments({
                $or: [
                    { createdAt: { $gte: start, $lte: end } },
                    { createdAt: { $gte: isoStart, $lte: isoEnd } },
                    { date: isoStart.split('T')[0] } // Legacy string date check
                ]
            });
        };

        const getEvents = async (start: Date, end: Date) => {
            const isoStart = start.toISOString();
            const isoEnd = end.toISOString();
            const dateStr = isoStart.split('T')[0];
            return await db.collection("events").countDocuments({
                $or: [
                    { date: dateStr },
                    { startDate: { $gte: isoStart, $lte: isoEnd } },
                    { createdAt: { $gte: start, $lte: end } }
                ]
            });
        };

        // Execution
        const [
            todayVisitors, yesterdayVisitors,
            todayEvents, yesterdayEvents,
            todayRevenue, yesterdayRevenue,
            staffOnDuty,
            openChecks
        ] = await Promise.all([
            getVisitors(todayStart, todayEnd), getVisitors(yesterdayStart, yesterdayEnd),
            getEvents(todayStart, todayEnd), getEvents(yesterdayStart, yesterdayEnd),
            getRevenue(todayStart, todayEnd), getRevenue(yesterdayStart, yesterdayEnd),
            db.collection("staff_logs").countDocuments({ 
                $or: [
                    { endTime: null }, 
                    { endTime: { $exists: false } }
                ] 
            }),
            db.collection("checks").countDocuments({ status: "open" })
        ]);

        return NextResponse.json({
            success: true,
            data: {
                todayVisitors,
                visitorsTrend: calculateTrend(todayVisitors, yesterdayVisitors),
                
                activeEvents: todayEvents,
                eventsTrend: calculateTrend(todayEvents, yesterdayEvents),
                
                revenue: todayRevenue,
                revenueTrend: calculateTrend(todayRevenue, yesterdayRevenue),
                
                staffOnDuty,
                pendingTasks: openChecks, // This maps to "Pending Checks" in UI
            }
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json(
            { success: false, error: "Failed to load dashboard stats" },
            { status: 500 }
        );
    }
}
