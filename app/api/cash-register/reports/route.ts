
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'z-reports';
        const limit = Number(searchParams.get('limit')) || 50;

        const client = await clientPromise;
        const db = client.db("giraffe");

        if (type === 'z-reports') {
            const startDate = searchParams.get('startDate');
            const endDate = searchParams.get('endDate');

            const filter: any = { status: "closed" };

            if (startDate && endDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);

                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);

                // Assuming 'createdAt' or 'endTime' is the reference. Z-Report usually covers a shift. 
                // Let's filter by 'endTime' (when it was closed) or 'createdAt'. 
                // Using 'endTime' seems most appropriate for a closed shift "Z-Report date".
                filter.endTime = {
                    $gte: start,
                    $lte: end
                };
            }

            const shifts = await db.collection("cash_shifts")
                .find(filter)
                .sort({ endTime: -1 })
                .limit(limit)
                .toArray();

            return NextResponse.json({ success: true, data: shifts.map(s => ({ ...s, id: s._id })) });
        }

        if (type === 'analytics') {
            const startDate = searchParams.get('startDate');
            const endDate = searchParams.get('endDate');

            const filter: any = {};
            if (startDate && endDate) {
                // Ensure full day coverage
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);

                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);

                filter.createdAt = {
                    $gte: start,
                    $lte: end
                };
            }

            const receipts = await db.collection("receipts")
                .find(filter)
                .sort({ createdAt: -1 }) // Newest first
                .limit(500) // Safety limit
                .toArray();

            return NextResponse.json({ success: true, data: { receipts: receipts.map(r => ({ ...r, id: r._id })) } });
        }

        return NextResponse.json({ error: "Unknown report type" }, { status: 400 });

    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
    }
}
