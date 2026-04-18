"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { SocialPost } from '@/types/social';
import styles from './social-planner.module.css';

const statusColorMap: Record<string, { background: string; color: string }> = {
    draft: { background: '#8B7355', color: '#ffffff' },
    scheduled: { background: '#4169E1', color: '#ffffff' },
    published: { background: '#228B22', color: '#ffffff' },
};

const statusLabelMap: Record<string, string> = {
    draft: 'Чернетка',
    scheduled: 'Заплановано',
    published: 'Опубліковано',
};

export default function SocialPlannerPreview() {
    const [posts, setPosts] = useState<SocialPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(23, 59, 59, 999);

                const startDate = today.toISOString();
                const endDate = tomorrow.toISOString();

                const response = await fetch(`/api/social-posts?limit=20&start=${startDate}&end=${endDate}`);
                const result = await response.json();
                if (response.ok && result.ok) {
                    const sorted = (result.data || []).sort(
                        (a: SocialPost, b: SocialPost) =>
                            new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
                    );
                    setPosts(sorted);
                }
            } catch (error) {
                console.error('Failed to load social planner preview', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPosts();
    }, []);

    return (
        <section className={styles.previewSection}>
            <div className={styles.previewHeader}>
                <div>
                    <h2 className={styles.sectionTitle}>Запланована публікація сьогодні + завтра</h2>
                    <p className={styles.previewDescription}>
                        {posts.length} постів заплановано на сьогодні та завтра
                    </p>
                </div>
                <Link href="/social-planner">
                    <Button variant="secondary">Планувальник постів</Button>
                </Link>
            </div>

            <Card className={styles.previewListCard} padding="md">
                {isLoading ? (
                    <p>Завантаження...</p>
                ) : posts.length === 0 ? (
                    <p className={styles.emptyState}>Поки немає запланованих постів на сьогодні та завтра.</p>
                ) : (
                    <div className={styles.previewPostList}>
                        {posts.map((post) => (
                            <div key={post._id} className={styles.previewPostRow}>
                                <div className={styles.postInfo}>
                                    <div className={styles.previewPostTitle}>{post.title}</div>
                                    <div className={styles.previewPostMeta}>
                                        {new Date(post.scheduledAt).toLocaleString('uk-UA', {
                                            day: '2-digit',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}{' '}
                                        · {post.channel}
                                    </div>
                                </div>
                                <span
                                    className={styles.previewPostStatus}
                                    style={statusColorMap[post.status] ?? { background: 'var(--gray-100)', color: 'var(--gray-700)' }}
                                >
                                    {statusLabelMap[post.status] ?? post.status}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </section>
    );
}

