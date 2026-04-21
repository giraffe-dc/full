import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db("giraffe");

        // 1. Fetch data in parallel
        const [receipts, visits, events, staffLogs, clients] = await Promise.all([
            db.collection("receipts").find().sort({ createdAt: -1 }).limit(15).toArray(),
            db.collection("visits").find().sort({ createdAt: -1 }).limit(15).toArray(),
            db.collection("events").find().sort({ createdAt: -1 }).limit(15).toArray(),
            db.collection("staff_logs").find().sort({ startTime: -1 }).limit(15).toArray(),
            db.collection("clients").find().sort({ createdAt: -1 }).limit(15).toArray()
        ]);

        // 2. Fetch staff names for logs
        const staffIds = [...new Set(staffLogs.map(log => log.staffId))];
        const staffMembers = await db.collection("staff").find({
            $or: [
                { _id: { $in: staffIds.filter(id => id instanceof ObjectId) } },
                { _id: { $in: staffIds.filter(id => typeof id === 'string' && id.length === 24).map(id => new ObjectId(id)) } }
            ]
        }).toArray();
        const staffMap = new Map(staffMembers.map(s => [s._id.toString(), s.name]));

        // 3. Map to unified format
        const activities: any[] = [];

        // Receipts -> Payments
        receipts.forEach(r => {
            activities.push({
                id: r._id.toString(),
                type: 'payment',
                icon: '💰',
                color: 'green',
                description: `Оплата: ₴${Math.round(r.total).toLocaleString()} (${r.waiter || 'Каса'})`,
                timestamp: r.createdAt,
                href: '/cash-register/history'
            });
        });

        // Visits
        visits.forEach(v => {
            activities.push({
                id: v._id.toString(),
                type: 'visit',
                icon: '👶',
                color: 'blue',
                description: `Візит: ${v.childName || 'Гість'} (${v.serviceName || 'Ігрова'})`,
                timestamp: v.createdAt || v.startTime,
                href: '/visits'
            });
        });

        // Events
        events.forEach(e => {
            activities.push({
                id: e._id.toString(),
                type: 'event',
                icon: '🎉',
                color: 'purple',
                description: `Бронювання: ${e.title} (${e.clientName})`,
                timestamp: e.createdAt,
                href: `/events`
            });
        });

        // Staff Logs
        staffLogs.forEach(log => {
            const staffName = staffMap.get(log.staffId.toString()) || 'Працівник';
            const isStart = !log.endTime || log.endTime === 'Триває';
            
            activities.push({
                id: log._id.toString(),
                type: 'staff',
                icon: '🕙',
                color: 'orange',
                description: `${staffName}: ${log.endTime ? 'завершення зміни' : 'початок зміни'}`,
                timestamp: log.endTime ? log.endTime : log.startTime,
                href: '/staff/schedule'
            });
        });

        // Clients
        clients.forEach(c => {
            activities.push({
                id: c._id.toString(),
                type: 'client',
                icon: '👤',
                color: 'pink',
                description: `Новий клієнт: ${c.name}`,
                timestamp: c.createdAt,
                href: '/clients'
            });
        });

        // 4. Sort and limit to 15 total
        const sortedActivities = activities
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 15);

        return NextResponse.json({
            success: true,
            data: sortedActivities
        });
    } catch (e) {
        console.error("Activities API error:", e);
        return NextResponse.json({ success: false, error: "Failed to load activities" }, { status: 500 });
    }
}
