import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import type { SocialPost } from '@/types/social';

export interface SocialPostDocument extends Omit<SocialPost, '_id'> {
    _id: ObjectId;
}

function toDto(doc: SocialPostDocument) {
    return {
        ...doc,
        _id: doc._id.toString(),
    };
}

export async function getSocialPostCollection() {
    const client = await clientPromise;
    return client.db().collection<SocialPostDocument>('social_posts');
}

export async function listSocialPosts(options: {
    limit?: number;
    start?: string;
    end?: string;
} = {}) {
    const collection = await getSocialPostCollection();
    const query: Record<string, any> = {};

    if (options.start || options.end) {
        query.scheduledAt = {};

        if (options.start) {
            query.scheduledAt.$gte = new Date(options.start).toISOString();
        }

        if (options.end) {
            query.scheduledAt.$lte = new Date(options.end).toISOString();
        }
    }

    const cursor = collection.find(query).sort({ scheduledAt: 1 });
    if (options.limit && options.limit > 0) {
        cursor.limit(options.limit);
    }

    const docs = await cursor.toArray();
    return docs.map(toDto);
}

export async function getSocialPostById(id: string) {
    try {
        const collection = await getSocialPostCollection();
        const doc = await collection.findOne({ _id: new ObjectId(id) });
        return doc ? toDto(doc) : null;
    } catch {
        return null;
    }
}

type NewSocialPostDocument = Omit<SocialPostDocument, '_id'>;

export async function createSocialPost(post: Omit<SocialPost, '_id'>) {
    const collection = await getSocialPostCollection();
    const now = new Date().toISOString();
    const document: NewSocialPostDocument = {
        ...post,
        createdAt: now,
        updatedAt: now,
    };

    const inserted = await collection.insertOne(document as any);

    return {
        createdAt: now,
        updatedAt: now,
    };
}

export async function updateSocialPost(id: string, update: Partial<Omit<SocialPost, '_id'>>) {
    try {
        const collection = await getSocialPostCollection();

        const updated = await collection.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: { ...update, updatedAt: new Date().toISOString() } },
            { returnDocument: 'after' }
        );

        return updated.value ? toDto(updated.value) : null;
    } catch {
        return null;
    }
}

export async function deleteSocialPost(id: string) {
    try {
        const collection = await getSocialPostCollection();
        const result = await collection.deleteOne({ _id: new ObjectId(id) });
        return result.deletedCount === 1;
    } catch {
        return false;
    }
}
