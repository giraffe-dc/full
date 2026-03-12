import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db("giraffe");

        // Set default templates if empty
        const defaultTemplates = [
            {
                type: 'birthday',
                text: '🎉 Вітаємо [ChildName] з днем народження! Бажаємо всього найкращого! Даруємо знижку 10% на наступне відвідування Giraffe! 🦒',
                isActive: true
            },
            {
                type: 'birthday_reminder_1m',
                text: '📅 Нагадуємо, що через місяць день народження у [ChildName]! 🎂\n\n[ClientName], допоможіть нам підготувати свято заздалегідь.\nЗателефонуйте нам або забронюйте дату онлайн.\n\n🦒 Giraffe',
                isActive: true
            },
            {
                type: 'reminder',
                text: '🦒 Привіт, [ClientName]! Нагадуємо, що завтра чекаємо вас на святкування. Не забудьте гарний настрій!',
                isActive: true
            },
            {
                type: 'bot_start_greeting',
                text: 'Вітаємо у Giraffe! 🦒\n\nДля того, щоб отримувати автоматичні сповіщення про ваші бронювання та подарунки до дня народження дітей, будь ласка, поділіться вашим номером телефону, натиснувши кнопку нижче.',
                isActive: true
            },
            {
                type: 'bot_share_button',
                text: '📱 Поділитися номером телефону',
                isActive: true
            },
            {
                type: 'bot_success_reply',
                text: 'Дякуємо, [ClientName]! ✅\n\nВаш аккаунт успішно підключено. Тепер ви будете отримувати нагадування та спеціальні пропозиції від нашої дитячої кімнати.',
                isActive: true
            },
            {
                type: 'bot_failure_reply',
                text: 'На жаль, ми не знайшли клієнта з таким номером телефону у нашій базі. 😔\n\nБудь ласка, зверніться до адміністратора Giraffe при наступному візиті, щоб ми додали ваш номер.',
                isActive: true
            },
            {
                type: 'invitation_text',
                text: 'Привіт! Це Giraffe 🦒. Підключайтесь до нашого Telegram-бота, щоб завжди бути в курсі акцій та отримувати подарунки: https://t.me/giraffe_Teplyk_bot',
                isActive: true
            }
        ];

        let settings = await db.collection("telegram_settings").find({}).toArray();

        // Check if new fields are missing from existing DB
        if (settings.length > 0) {
            const existingTypes = settings.map(s => s.type);
            const missingDefaults = defaultTemplates.filter(d => !existingTypes.includes(d.type));
            if (missingDefaults.length > 0) {
                await db.collection("telegram_settings").insertMany(missingDefaults);
                settings = await db.collection("telegram_settings").find({}).toArray();
            }
        }

        // Initialize defaults if collection is empty
        if (settings.length === 0) {
            await db.collection("telegram_settings").insertMany(defaultTemplates);
            settings = await db.collection("telegram_settings").find({}).toArray();
        }

        return NextResponse.json({ success: true, data: settings });
    } catch (error) {
        console.error("Failed to fetch telegram settings:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const body = await req.json(); // array of template objects
        const client = await clientPromise;
        const db = client.db("giraffe");

        if (Array.isArray(body)) {
            // Bulk update
            for (const item of body) {
                await db.collection("telegram_settings").updateOne(
                    { type: item.type },
                    { $set: { text: item.text, isActive: item.isActive } },
                    { upsert: true }
                );
            }
        }

        return NextResponse.json({ success: true, message: "Settings updated" });
    } catch (error) {
        console.error("Failed to update telegram settings:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
