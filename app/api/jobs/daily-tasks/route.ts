import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { sendTelegramMessage } from "@/lib/telegram";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
    try {
        // Simple security check
        const authHeader = req.headers.get("Authorization");
        const jobSecret = process.env.JOB_SECRET;
        
        if (jobSecret && authHeader !== `Bearer ${jobSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const client = await clientPromise;
        const db = client.db("giraffe");

        // Fetch settings
        const settings = await db.collection("telegram_settings").find({}).toArray();
        const birthdaySetting = settings.find(s => s.type === 'birthday');
        const reminderSetting = settings.find(s => s.type === 'reminder');

        const today = new Date();
        const todayStr = today.toISOString().slice(5, 10); // MM-DD format

        const results: any = {
            birthdays: 0,
            reminders: 0,
            errors: []
        };

        // 1. Process Birthdays
        if (birthdaySetting?.isActive) {
            const birthdayClients = await db.collection("clients").find({
                birthday: { $regex: new RegExp(`-${todayStr}$`) },
                telegramChatId: { $exists: true, $ne: "" },
                status: { $ne: "inactive" }
            }).toArray();

            for (const c of birthdayClients) {
                let message = birthdaySetting.text || '';
                message = message.replace(/\[ChildName\]/g, "дитина"); // Replace with actual child name logic if available
                message = message.replace(/\[ClientName\]/g, c.name || "Клієнт");
                
                const res = await sendTelegramMessage(c.telegramChatId, message);
                if (res.success) results.birthdays++;
                else results.errors.push(`Birthday error for ${c.name}: ${JSON.stringify(res.error)}`);
            }
        }

        // 2. Process Reminders (Events for tomorrow)
        if (reminderSetting?.isActive) {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStart = new Date(tomorrow.setHours(0, 0, 0, 0)).toISOString();
            const tomorrowEnd = new Date(tomorrow.setHours(23, 59, 59, 999)).toISOString();

            const tomorrowEvents = await db.collection("events").find({
                date: { $gte: tomorrowStart, $lte: tomorrowEnd },
                status: { $in: ['confirmed', 'paid'] }
            }).toArray();

            for (const event of tomorrowEvents) {
                if (event.customerId) {
                    const customer = await db.collection("clients").findOne({ 
                        _id: typeof event.customerId === 'string' ? new ObjectId(event.customerId) : event.customerId 
                    });
                    
                    if (customer && customer.telegramChatId) {
                        let message = reminderSetting.text || '';
                        message = message.replace(/\[ClientName\]/g, customer.name || "Клієнт");
                        message = message.replace(/\[EventTitle\]/g, event.title || "Свято");
                        message = message.replace(/\[EventTime\]/g, event.startTime || event.time || "завтра");
                        
                        const res = await sendTelegramMessage(customer.telegramChatId, message);
                        if (res.success) results.reminders++;
                        else results.errors.push(`Reminder error for ${customer.name}: ${JSON.stringify(res.error)}`);
                    }
                }
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (error) {
        console.error("Daily job error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
