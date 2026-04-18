import { NextRequest, NextResponse } from 'next/server';
import { createSocialPost, listSocialPosts } from '@/lib/models/SocialPost';
import { verifyToken } from '@/lib/auth';
import type { SocialPost } from '@/types/social';

export async function GET(req: NextRequest) {
    const token = req.cookies.get('token')?.value;
    const user = verifyToken(token);

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const limit = Number(url.searchParams.get('limit') || '50');
    const start = url.searchParams.get('start') || undefined;
    const end = url.searchParams.get('end') || undefined;

    const posts = await listSocialPosts({ limit, start, end });

    return NextResponse.json({ ok: true, data: posts });
}

export async function POST(req: NextRequest) {
    const token = req.cookies.get('token')?.value;
    const user = verifyToken(token);

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, content, channel, scheduledAt, status, tags, generatedByAI } = body as Partial<SocialPost>;

    if (!title || !content || !channel || !scheduledAt || !status) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    try {
        const post = await createSocialPost({
            title: title.trim(),
            content: content.trim(),
            channel: channel as SocialPost['channel'],
            scheduledAt: new Date(scheduledAt).toISOString(),
            status: status as SocialPost['status'],
            tags: Array.isArray(tags) ? tags.map((tag) => tag.trim()).filter(Boolean) : [],
            createdBy: user.email || String(user.sub || ''),
            generatedByAI: Boolean(generatedByAI),
        });

        return NextResponse.json({ ok: true, data: post }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
    }
}
