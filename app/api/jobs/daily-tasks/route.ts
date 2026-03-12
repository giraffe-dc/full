import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { sendTelegramMessage } from "@/lib/telegram";
import { ObjectId } from "mongodb";
import { calculateAge, formatDateUA } from "@/lib/date-utils";

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
        const birthdayReminder1mSetting = settings.find(s => s.type === 'birthday_reminder_1m');
        const reminderSetting = settings.find(s => s.type === 'reminder');

        const today = new Date();
        const todayStr = today.toISOString().slice(5, 10); // MM-DD format

        const results: any = {
            birthdays: 0,
            birthdayReminders1m: 0,
            eventReminders: 0,
            errors: []
        };

        // ===========================================
        // 1. Process Birthdays (TODAY)
        // ===========================================
        if (birthdaySetting?.isActive) {
            // Find clients with children having birthday today
            const birthdayClients = await db.collection("clients").find({
                "children.birthday": { $regex: new RegExp(`-${todayStr}$`) },
                telegramChatId: { $exists: true, $ne: "" },
                status: { $ne: "inactive" }
            }).toArray();

            for (const client of birthdayClients) {
                // Find all children with birthday today
                const childrenWithBirthday = (client.children || []).filter((child: any) => {
                    return child.birthday && child.birthday.endsWith(todayStr);
                });

                for (const child of childrenWithBirthday) {
                    let message = birthdaySetting.text || '';
                    const age = calculateAge(child.birthday);
                    
                    message = message.replace(/\[ChildName\]/g, child.name || "дитина");
                    message = message.replace(/\[ChildAge\]/g, age.toString());
                    message = message.replace(/\[ClientName\]/g, client.name || "Клієнт");

                    const res = await sendTelegramMessage(client.telegramChatId, message);
                    if (res.success) {
                        results.birthdays++;
                    } else {
                        results.errors.push(`Birthday error for ${client.name} (child ${child.name}): ${JSON.stringify(res.error)}`);
                    }
                }
            }
        }

        // ===========================================
        // 2. Process Birthday Reminders (1 MONTH BEFORE)
        // ===========================================
        if (birthdayReminder1mSetting?.isActive) {
            // Calculate next month's date pattern
            const nextMonth = new Date(today);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            const nextMonthStr = nextMonth.toISOString().slice(5, 10); // MM-DD format

            // Find clients with children having birthday next month
            const reminderClients = await db.collection("clients").find({
                "children.birthday": { $regex: new RegExp(`-${nextMonthStr}$`) },
                telegramChatId: { $exists: true, $ne: "" },
                status: { $ne: "inactive" }
            }).toArray();

            for (const client of reminderClients) {
                // Find all children with birthday next month
                const childrenWithBirthdayNextMonth = (client.children || []).filter((child: any) => {
                    return child.birthday && child.birthday.endsWith(nextMonthStr);
                });

                for (const child of childrenWithBirthdayNextMonth) {
                    let message = birthdayReminder1mSetting.text || '';
                    const birthdayDate = formatDateUA(child.birthday);
                    
                    message = message.replace(/\[ChildName\]/g, child.name || "дитина");
                    message = message.replace(/\[ClientName\]/g, client.name || "Клієнт");
                    message = message.replace(/\[BirthdayDate\]/g, birthdayDate);

                    const res = await sendTelegramMessage(client.telegramChatId, message);
                    if (res.success) {
                        results.birthdayReminders1m++;
                    } else {
                        results.errors.push(`Birthday reminder error for ${client.name} (child ${child.name}): ${JSON.stringify(res.error)}`);
                    }
                }
            }
        }

        // ===========================================
        // 3. Process Event Reminders (TOMORROW)
        // ===========================================
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
                        if (res.success) {
                            results.eventReminders++;
                        } else {
                            results.errors.push(`Reminder error for ${customer.name}: ${JSON.stringify(res.error)}`);
                        }
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
