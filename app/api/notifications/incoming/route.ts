import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";
import type { Notification, NotificationType, NotificationSource } from "../../../../types/accounting";

/**
 * POST /api/notifications/incoming
 * Receive notifications from external sources (Telegram bot, other websites, etc.)
 * 
 * Body:
 * {
 *   title: string;
 *   message: string;
 *   type?: 'info' | 'success' | 'warning' | 'error' | 'system';
 *   source?: 'telegram' | 'website' | 'system' | 'api' | 'external';
 *   externalId?: string; // External system message ID
 *   metadata?: Record<string, any>; // Additional data
 *   apiKey?: string; // Optional API key for authentication
 * }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { title, message, type = 'info', source = 'external', externalId, metadata, apiKey } = body;

        // Validation
        if (!title || !message) {
            return NextResponse.json(
                { error: "Title and message are required" },
                { status: 400 }
            );
        }

        // Optional: API Key authentication
        const expectedApiKey = process.env.NOTIFICATIONS_API_KEY;
        if (expectedApiKey && apiKey !== expectedApiKey) {
            return NextResponse.json(
                { error: "Invalid API key" },
                { status: 401 }
            );
        }

        const client = await clientPromise;
        const db = client.db("giraffe");

        // Create notification
        const notification: Omit<Notification, '_id'> = {
            title,
            message,
            type: type as NotificationType,
            source: source as NotificationSource,
            isRead: false,
            externalId: externalId || undefined,
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
        console.error("Incoming notification error:", err);
        return NextResponse.json(
            {
                error: "Failed to create notification",
                details: err instanceof Error ? err.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
