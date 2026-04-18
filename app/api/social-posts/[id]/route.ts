import { NextRequest, NextResponse } from 'next/server';
import { deleteSocialPost, getSocialPostById, updateSocialPost } from '@/lib/models/SocialPost';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const token = req.cookies?.get('token')?.value;
    const user = verifyToken(token);

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const post = await getSocialPostById(id);
    if (!post) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: post });
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const token = req.cookies?.get('token')?.value;
    const user = verifyToken(token);

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { _id, ...payload } = body;

    const updated = await updateSocialPost(id, payload);
    if (!updated) {
        return NextResponse.json({ error: 'Failed to update post' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: updated });
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const token = req.cookies?.get('token')?.value;
    const user = verifyToken(token);

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const deleted = await deleteSocialPost(id);
    if (!deleted) {
        return NextResponse.json({ error: 'Failed to delete post' }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
}
