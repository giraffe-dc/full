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

        // Dates are usually stored as strings in 'YYYY-MM-DD' or ISO
        const isoStart = todayStart.toISOString();
        const isoEnd = todayEnd.toISOString();
        const dateString = isoStart.split('T')[0];

        // 1. Visitors Today
        // Try getting visits by date string or exact date
        const todayVisitorsCount = await db.collection("visits").countDocuments({
            date: dateString
        });

        // 2. Active Events (events created for today)
        const activeEventsCount = await db.collection("events").countDocuments({
            $or: [
                { date: dateString },
                { startDate: { $gte: isoStart, $lte: isoEnd } }
            ]
        });

        console.log("isoStart", isoStart);
        console.log("isoEnd", isoEnd);

        // 3. Revenue (Paid receipts modified or created today)
        const todayChecks = await db.collection("receipts").find({
            $or: [
                { updatedAt: { $gte: todayStart, $lte: todayEnd } },
                { updatedAt: { $gte: isoStart, $lte: isoEnd } }
            ]
        }).toArray();

        // console.log("todayChecks", todayChecks.length);

        const revenue = todayChecks.reduce((acc, check) => acc + (Number(check.total) || 0), 0);

        // 4. Pending Tasks / Open Checks
        const openChecksCount = await db.collection("checks").countDocuments({
            status: "open"
        });

        return NextResponse.json({
            success: true,
            data: {
                todayVisitors: todayVisitorsCount,
                activeEvents: activeEventsCount,
                revenue: revenue,
                pendingTasks: openChecksCount,
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
