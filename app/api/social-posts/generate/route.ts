import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

const QWEN_API_KEY = process.env.QWEN_API_KEY;
const QWEN_API_URL = process.env.QWEN_API_URL || 'https://api.qwen.qq.com/v1/chat/completions';
const QWEN_API_MODEL = process.env.QWEN_API_MODEL || 'qwen-3.0-mini';

interface GeneratePayload {
    prompt: string;
    channel: string;
    tone?: string;
    length?: string;
}

function safeParseJson(value: string) {
    try {
        return JSON.parse(value);
    } catch {
        const match = value.match(/\{[\s\S]*\}/);
        if (match) {
            try {
                return JSON.parse(match[0]);
            } catch {
                return null;
            }
        }
        return null;
    }
}

function buildFallback(prompt: string, channel: string, tone: string, length: string) {
    return {
        title: `Анонс для ${channel} про ${prompt}`,
        content: `Підготуйте яскравий пост у ${channel} у ${tone} тоні. Тема: ${prompt}. Рекомендована довжина: ${length}. Додайте заклик до дії та хештеги.`,
    };
}

export async function POST(req: NextRequest) {
    const token = req.cookies.get('token')?.value;
    const user = verifyToken(token);

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as GeneratePayload;

    if (!body.prompt || !body.channel) {
        return NextResponse.json({ error: 'Missing prompt or channel' }, { status: 400 });
    }

    const tone = body.tone || 'дружній';
    const length = body.length || 'середній';

    if (!QWEN_API_KEY) {
        return NextResponse.json({ ok: true, generated: buildFallback(body.prompt, body.channel, tone, length) });
    }

    try {
        const qwenResponse = await fetch(QWEN_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${QWEN_API_KEY}`,
            },
            body: JSON.stringify({
                model: QWEN_API_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a Ukrainian social media copywriter.',
                    },
                    {
                        role: 'user',
                        content: `Створи заголовок та текст для соціального поста українською мовою. Канал: ${body.channel}. Тон: ${tone}. Довжина: ${length}. Тема: ${body.prompt}. Відповідь надай у форматі JSON з полями title та content.`,
                    },
                ],
                temperature: 0.8,
                max_tokens: 400,
                top_p: 0.95,
            }),
        });

        const data = await qwenResponse.json();
        const text =
            data?.choices?.[0]?.message?.content ||
            data?.choices?.[0]?.delta?.content ||
            data?.choices?.[0]?.content ||
            data?.result?.content ||
            data?.content;

        if (typeof text !== 'string') {
            return NextResponse.json({ ok: true, generated: buildFallback(body.prompt, body.channel, tone, length) });
        }

        const parsed = safeParseJson(text);
        if (parsed?.title && parsed?.content) {
            return NextResponse.json({ ok: true, generated: { title: parsed.title, content: parsed.content } });
        }

        return NextResponse.json({ ok: true, generated: buildFallback(body.prompt, body.channel, tone, length) });
    } catch (error) {
        return NextResponse.json({ ok: true, generated: buildFallback(body.prompt, body.channel, tone, length) });
    }
}
