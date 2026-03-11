
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { sendTelegramMessage } from "@/lib/telegram";

// Helper to get setting text by type
async function getSettingText(db: any, type: string, defaultText: string): Promise<string> {
    const setting = await db.collection("telegram_settings").findOne({ type });
    return setting?.text || defaultText;
}

export async function POST(req: NextRequest) {
    try {
        const update = await req.json();
        const client = await clientPromise;
        const db = client.db("giraffe");

        // Handle message
        if (update.message) {
            const chatId = update.message.chat.id.toString();
            const text = update.message.text;

            // 1. Handle /start command
            if (text === "/start") {
                const greetingText = await getSettingText(
                    db,
                    "bot_start_greeting",
                    "Вітаємо у Giraffe! 🦒\n\nДля того, щоб отримувати автоматичні сповіщення про ваші бронювання та подарунки до дня народження дітей, будь ласка, поділіться вашим номером телефону, натиснувши кнопку нижче."
                );
                const buttonText = await getSettingText(
                    db,
                    "bot_share_button",
                    "📱 Поділитися номером телефону"
                );

                await sendTelegramMessage(
                    chatId,
                    greetingText,
                    {
                        keyboard: [
                            [{ text: buttonText, request_contact: true }]
                        ],
                        resize_keyboard: true,
                        one_time_keyboard: true
                    }
                );
            }

            // 2. Handle shared contact
            if (update.message.contact) {
                let phone = update.message.contact.phone_number;

                // Clean phone number (remove +, spaces, etc.)
                // Standardizing to digits only
                const cleanPhone = phone.replace(/\D/g, "");

                // Search for client by phone suffix (last 9-10 digits) to avoid country code mismatches
                const phoneSuffix = cleanPhone.slice(-9);

                const existingClient = await db.collection("clients").findOne({
                    phone: { $regex: new RegExp(phoneSuffix + "$") },
                    status: { $ne: "inactive" }
                });

                if (existingClient) {
                    await db.collection("clients").updateOne(
                        { _id: existingClient._id },
                        { $set: { telegramChatId: chatId, updatedAt: new Date() } }
                    );

                    const successText = await getSettingText(
                        db,
                        "bot_success_reply",
                        `Дякуємо, ${existingClient.name}! ✅\n\nВаш аккаунт успішно підключено. Тепер ви будете отримувати нагадування та спеціальні пропозиції від нашої дитячої кімнати.`
                    );
                    // Replace [ClientName] placeholder
                    const finalSuccessText = successText.replace(/\[ClientName\]/g, existingClient.name || "Клієнт");

                    await sendTelegramMessage(
                        chatId,
                        finalSuccessText
                    );
                } else {
                    const failureText = await getSettingText(
                        db,
                        "bot_failure_reply",
                        "На жаль, ми не знайшли клієнта з таким номером телефону у нашій базі. 😔\n\nБудь ласка, зверніться до адміністратора Giraffe при наступному візиті, щоб ми додали ваш номер."
                    );

                    await sendTelegramMessage(
                        chatId,
                        failureText
                    );
                }
            }
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Webhook error:", error);
        return NextResponse.json({ ok: false, error: "Internal Error" }, { status: 500 });
    }
}
