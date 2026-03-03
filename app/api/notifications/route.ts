import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";
import type { Notification, NotificationStats } from "../../../types/accounting";

/**
 * GET /api/notifications
 * Get notifications list with optional filters
 * 
 * Query params:
 * - limit?: number (default: 50)
 * - unread?: boolean (filter only unread)
 * - type?: string (filter by type)
 * - source?: string (filter by source)
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get("limit") || "50");
        const unread = searchParams.get("unread") === "true";
        const type = searchParams.get("type");
        const source = searchParams.get("source");

        const client = await clientPromise;
        const db = client.db("giraffe");

        // Build query
        const query: Record<string, any> = {};
        if (unread) query.isRead = false;
        if (type) query.type = type;
        if (source) query.source = source;

        // Fetch notifications
        const notifications = await db
            .collection<Notification>("notifications")
            .find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray();

        // Map _id to id for frontend compatibility
        const formattedNotifications = notifications.map(n => ({
            ...n,
            id: n._id.toString(),
        }));

        // Calculate stats
        const total = await db.collection("notifications").countDocuments(query);
        const unreadCount = await db.collection("notifications").countDocuments({ ...query, isRead: false });

        // Count by type
        const byTypePipeline = [
            { $match: query },
            { $group: { _id: "$type", count: { $sum: 1 } } }
        ];
        const typeStats = await db.collection("notifications").aggregate(byTypePipeline).toArray();
        const byType: Record<string, number> = {};
        typeStats.forEach((s: any) => {
            byType[s._id] = s.count;
        });

        const stats: NotificationStats = {
            total,
            unread: unreadCount,
            byType: byType as any,
        };

        return NextResponse.json({
            success: true,
            data: formattedNotifications,
            stats,
        });
    } catch (err) {
        console.error("Get notifications error:", err);
        return NextResponse.json(
            {
                error: "Failed to fetch notifications",
                details: err instanceof Error ? err.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

/**
 * POST /api/notifications
 * Create a new notification (internal use)
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { title, message, type = 'info', source = 'system', metadata } = body;

        if (!title || !message) {
            return NextResponse.json(
                { error: "Title and message are required" },
                { status: 400 }
            );
        }

        const client = await clientPromise;
        const db = client.db("giraffe");

        const notification: Omit<Notification, '_id'> = {
            title,
            message,
            type,
            source,
            isRead: false,
            metadata: metadata || {},
            createdAt: new Date().toISOString(),
        };

        const result = await db.collection("notifications").insertOne(notification);

        return NextResponse.json({
            success: true,
            id: result.insertedId.toString(),
            notification: { ...notification, id: result.insertedId.toString() },
        }, { status: 201 });
    } catch (err) {
        console.error("Create notification error:", err);
        return NextResponse.json(
            { error: "Failed to create notification" },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/notifications
 * Mark notifications as read
 * 
 * Body:
 * {
 *   ids?: string[]; // Specific notification IDs to mark as read
 *   markAllAsRead?: boolean; // Mark all as read
 * }
 */
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { ids, markAllAsRead } = body;

        const client = await clientPromise;
        const db = client.db("giraffe");

        if (markAllAsRead) {
            // Mark all as read
            await db.collection("notifications").updateMany(
                { isRead: false },
                { $set: { isRead: true, readAt: new Date().toISOString() } }
            );
        } else if (ids && Array.isArray(ids)) {
            // Mark specific notifications as read
            const objectIds = ids
                .filter(id => ObjectId.isValid(id))
                .map(id => new ObjectId(id));

            await db.collection("notifications").updateMany(
                { _id: { $in: objectIds }, isRead: false },
                { $set: { isRead: true, readAt: new Date().toISOString() } }
            );
        } else {
            return NextResponse.json(
                { error: "Provide ids or markAllAsRead" },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Mark as read error:", err);
        return NextResponse.json(
            { error: "Failed to mark notifications as read" },
            { status: 500 }
        );
    }
}
