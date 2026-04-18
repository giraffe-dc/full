export type SocialPostStatus = 'draft' | 'scheduled' | 'published';
export type SocialChannel = 'instagram' | 'facebook' | 'telegram' | 'linkedin' | 'tiktok' | 'other';

export interface SocialPost {
    _id?: string;
    title: string;
    content: string;
    channel: SocialChannel;
    scheduledAt: string;
    status: SocialPostStatus;
    tags: string[];
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
    generatedByAI?: boolean;
}
