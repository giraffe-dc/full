
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { sendTelegramMessage } from "@/lib/telegram";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { clientIds, text, promotionId } = body;

        if (!text && !promotionId) {
            return NextResponse.json({ error: "Text or Promotion MVP is required" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db("giraffe");

        // 1. Fetch Clients
        let query: any = { telegramChatId: { $exists: true, $ne: "" }, status: { $ne: "inactive" } };
        
        if (clientIds && Array.isArray(clientIds) && clientIds.length > 0) {
            query._id = { $in: clientIds.map(id => new ObjectId(id)) };
        }

        const targetClients = await db.collection("clients").find(query).toArray();

        if (targetClients.length === 0) {
            return NextResponse.json({ success: true, message: "No target clients with Telegram found", count: 0 });
        }

        // 2. Prepare message
        let finalMessage = "";

        if (promotionId) {
            const promotion = await db.collection("promotions").findOne({ _id: new ObjectId(promotionId) });
            if (promotion) {
                const resultMsg = promotion.result.type === 'percent_discount' 
                    ? `зі знижкою ${promotion.result.value}%`
                    : promotion.result.type === 'fixed_discount'
                    ? `зі знижкою ${promotion.result.value} ₴`
                    : `з бонусом ${promotion.result.value}`;
                
                finalMessage = `🌟 <b>${promotion.name}</b> 🌟\n\nЧудова новина! У нас діє спеціальна пропозиція ${resultMsg}.\n\nЗавітайте до нас з ${promotion.startDate} до ${promotion.endDate} та скористайтеся вигодою! 🦒`;
            }
        }

        if (text) {
            if (finalMessage) {
                finalMessage = `${text}\n\n${finalMessage}`;
            } else {
                finalMessage = text;
            }
        }

        // 3. Send messages
        let successCount = 0;
        const failed: string[] = [];

        for (const c of targetClients) {
            const res = await sendTelegramMessage(c.telegramChatId, finalMessage);
            if (res.success) {
                successCount++;
            } else {
                failed.push(c.name);
                console.error(`Failed to send to ${c.name}:`, res.error);
            }
        }

        return NextResponse.json({ 
            success: true, 
            message: `Повідомлення надіслано ${successCount} клієнтам`, 
            count: successCount,
            failed 
        });

    } catch (error) {
        console.error("Custom Broadcast error:", error);
        return NextResponse.json({ error: "Internal Error", details: String(error) }, { status: 500 });
    }
}
