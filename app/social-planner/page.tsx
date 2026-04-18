"use client";

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CalendarWidget } from '@/components/social-planner/CalendarWidget';
import { PostFormModal } from '@/components/social-planner/PostFormModal';
import type { SocialPost } from '@/types/social';
import styles from '@/components/social-planner/social-planner.module.css';

const statusLabelMap: Record<string, string> = {
    draft: 'Чернетка',
    scheduled: 'Заплановано',
    published: 'Опубліковано',
};

export default function SocialPlannerPage() {
    const [posts, setPosts] = useState<SocialPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activePost, setActivePost] = useState<SocialPost | null>(null);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadPosts = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/social-posts?limit=50');
            const result = await response.json();
            if (response.ok && result.ok) {
                setPosts(result.data || []);
            } else {
                throw new Error(result.error || 'Не вдалося завантажити пости.');
            }
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Помилка завантаження.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadPosts();
    }, []);

    const sortedPosts = useMemo(
        () => [...posts].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
        [posts]
    );

    const upcoming = useMemo(() => {
        const now = new Date();
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        end.setDate(end.getDate() + 2);

        return sortedPosts.filter((post) => {
            if (post.status !== 'scheduled') return false;
            const scheduled = new Date(post.scheduledAt);
            return scheduled >= now && scheduled <= end;
        });
    }, [sortedPosts]);

    const selectedDatePosts = useMemo(() => {
        if (!selectedDate) return [];
        return sortedPosts.filter((post) => post.scheduledAt.slice(0, 10) === selectedDate);
    }, [selectedDate, sortedPosts]);

    const openNewPost = () => {
        setActivePost(null);
        setIsModalOpen(true);
    };

    const openNewPostForDate = (date: string) => {
        setActivePost(null);
        setSelectedDate(date);
        setIsModalOpen(true);
    };

    const openEditPost = (post: SocialPost) => {
        setActivePost(post);
        setIsModalOpen(true);
    };

    const handleSave = async (post: Omit<SocialPost, '_id'> & { _id?: string }) => {
        try {
            const method = post._id ? 'PATCH' : 'POST';
            const url = post._id ? `/api/social-posts/${post._id}` : '/api/social-posts';
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(post),
            });
            const result = await response.json();
            if (!response.ok || !result.ok) {
                throw new Error(result.error || 'Не вдалося зберегти пост.');
            }
            await loadPosts();
            setIsModalOpen(false);
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Помилка збереження.');
        }
    };

    const handleDelete = async (post: SocialPost) => {
        if (!confirm('Видалити цей пост?')) return;

        try {
            const response = await fetch(`/api/social-posts/${post._id}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok || !result.ok) {
                throw new Error(result.error || 'Не вдалося видалити пост.');
            }
            await loadPosts();
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'Помилка видалення.');
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Планувальник соцмереж</h1>
                    <p className={styles.pageIntro}>
                        Керуйте публікаціями, розкладайте пости за датами.
                    </p>
                </div>
                <Button variant="primary" onClick={openNewPost}>
                    Новий пост
                </Button>
            </div>

            <div className={styles.planGrid}>
                <Card className={styles.calendarCard} padding="md">
                    <div className={styles.sectionHeader}>
                        <h3>Календар</h3>
                        <span>{sortedPosts.length} постів</span>
                    </div>
                    <CalendarWidget
                        posts={posts}
                        selectedDate={selectedDate || undefined}
                        onSelectDate={(date) => setSelectedDate(date)}
                        onPostClick={openEditPost}
                        onEmptyCellClick={openNewPostForDate}
                    />

                    {selectedDate && (
                        <div className={styles.calendarDayListSection}>
                            <div className={styles.sectionHeader}>
                                <h3>
                                    Пости на{' '}
                                    {new Date(selectedDate + 'T00:00').toLocaleString('uk-UA', {
                                        weekday: 'long',
                                        day: 'numeric',
                                        month: 'long',
                                    })}
                                </h3>
                                <span>{selectedDatePosts.length} постів</span>
                            </div>

                            {selectedDatePosts.length === 0 ? (
                                <p className={styles.emptyState}>Постів на цей день нема.</p>
                            ) : (
                                <div className={styles.postList}>
                                    {selectedDatePosts.map((post) => (
                                        <div key={post._id} className={styles.postCard}>
                                            <div className={styles.postCardHeader}>
                                                <div>
                                                    <h4 className={styles.postTitle}>{post.title}</h4>
                                                    <p className={styles.postMeta}>
                                                        {new Date(post.scheduledAt).toLocaleString('uk-UA', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                        {' · '}
                                                        {post.channel}
                                                    </p>
                                                </div>
                                                <span className={styles.statusBadge}>{statusLabelMap[post.status] ?? post.status}</span>
                                            </div>

                                            <p className={styles.postContent}>{post.content.substring(0, 150)}...</p>

                                            <div>
                                                <p className={styles.postMeta}>{post.tags.map((tag) => `#${tag}`).join(' ')}</p>
                                            </div>

                                            <div className={styles.modalActions}>
                                                <Button variant="outline" size="sm" onClick={() => openEditPost(post)}>
                                                    Редагувати
                                                </Button>
                                                <Button variant="danger" size="sm" onClick={() => handleDelete(post)}>
                                                    Видалити
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </Card>

                <Card className={styles.listCard} padding="md">
                    <div className={styles.sectionHeader}>
                        <h3>Заплановані пости на сьогодні-завтра</h3>
                        <span>{upcoming.length} всього</span>
                    </div>

                    {error && <div className={styles.errorText}>{error}</div>}

                    {isLoading ? (
                        <p>Завантаження...</p>
                    ) : upcoming.length === 0 ? (
                        <p className={styles.emptyState}>Тут зʼявляться заплановані пости на найближчі 2 дні.</p>
                    ) : (
                        <div className={styles.postList}>
                            {upcoming.map((post) => (
                                <div key={post._id} className={styles.postCard}>
                                    <div className={styles.postCardHeader}>
                                        <div>
                                            <h4 className={styles.postTitle}>{post.title}</h4>
                                            <p className={styles.postMeta}>
                                                {new Date(post.scheduledAt).toLocaleString('uk-UA', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                                {' · '}
                                                {post.channel}
                                            </p>
                                        </div>
                                        <span className={styles.statusBadge}>{statusLabelMap[post.status] ?? post.status}</span>
                                    </div>

                                    <div>
                                        <p className={styles.postMeta}>{post.tags.map((tag) => `#${tag}`).join(' ')}</p>
                                    </div>

                                    <div className={styles.modalActions}>
                                        <Button variant="outline" size="sm" onClick={() => openEditPost(post)}>
                                            Редагувати
                                        </Button>
                                        <Button variant="danger" size="sm" onClick={() => handleDelete(post)}>
                                            Видалити
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            <PostFormModal open={isModalOpen} post={activePost} selectedDate={selectedDate || undefined} onClose={() => setIsModalOpen(false)} onSave={handleSave} />
        </div>
    );
}
