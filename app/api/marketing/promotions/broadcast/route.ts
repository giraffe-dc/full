
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { sendTelegramMessage } from "@/lib/telegram";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { promotionId, customMessage } = body;

        if (!promotionId) {
            return NextResponse.json({ error: "Promotion ID is required" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db("giraffe");

        // 1. Fetch Promotion
        const promotion = await db.collection("promotions").findOne({ _id: new ObjectId(promotionId) });
        if (!promotion) {
            return NextResponse.json({ error: "Promotion not found" }, { status: 404 });
        }

        // 2. Fetch all clients with Telegram
        const clientsWithTelegram = await db.collection("clients").find({
            telegramChatId: { $exists: true, $ne: "" },
            status: { $ne: "inactive" }
        }).toArray();

        if (clientsWithTelegram.length === 0) {
            return NextResponse.json({ success: true, message: "No clients with Telegram found", count: 0 });
        }

        // 3. Prepare message
        let text = customMessage;
        if (!text) {
            const resultMsg = promotion.result.type === 'percent_discount' 
                ? `зі знижкою ${promotion.result.value}%`
                : promotion.result.type === 'fixed_discount'
                ? `зі знижкою ${promotion.result.value} ₴`
                : `з бонусом ${promotion.result.value}`;
                
            text = `🌟 <b>Нова акція від Giraffe!</b> 🌟\n\n<b>${promotion.name}</b>\n\nЧудова новина! У нас діє спеціальна пропозиція ${resultMsg}.\n\nЗавітайте до нас з ${promotion.startDate} до ${promotion.endDate} та скористайтеся вигодою! 🦒`;
        }

        // 4. Send messages
        let successCount = 0;
        for (const c of clientsWithTelegram) {
            const res = await sendTelegramMessage(c.telegramChatId, text);
            if (res.success) successCount++;
        }

        return NextResponse.json({ 
            success: true, 
            message: `Повідомлення надіслано ${successCount} клієнтам`, 
            count: successCount 
        });

    } catch (error) {
        console.error("Broadcast error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
