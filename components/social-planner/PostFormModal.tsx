"use client";

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import type { SocialPost } from '@/types/social';
import styles from './social-planner.module.css';

const channelOptions = [
    { value: 'instagram/facebook', label: 'Instagram/Facebook' },
    // { value: 'facebook', label: 'Facebook' },
    // { value: 'telegram', label: 'Telegram' },
    // { value: 'linkedin', label: 'LinkedIn' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'other', label: 'Інше' },
];

const statusOptions = [
    { value: 'draft', label: 'Чернетка' },
    { value: 'scheduled', label: 'Заплановано' },
    { value: 'published', label: 'Опубліковано' },
];

interface PostFormModalProps {
    open: boolean;
    post: SocialPost | null;
    selectedDate?: string;
    onClose: () => void;
    onSave: (post: Omit<SocialPost, '_id'> & { _id?: string }) => Promise<void>;
}

export function PostFormModal({ open, post, selectedDate, onClose, onSave }: PostFormModalProps) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [channel, setChannel] = useState('instagram');
    const [scheduledAt, setScheduledAt] = useState('');
    const [status, setStatus] = useState<'draft' | 'scheduled' | 'published'>('draft');
    const [tags, setTags] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (post) {
            setTitle(post.title || '');
            setContent(post.content || '');
            setChannel(post.channel || 'instagram');
            setScheduledAt(post.scheduledAt ? post.scheduledAt.slice(0, 16) : '');
            setStatus(post.status || 'draft');
            setTags(post.tags?.join(', ') || '');
        } else {
            setTitle('');
            setContent('');
            setChannel('instagram');
            // Set default date to selected date at 09:00, or tomorrow at 09:00
            if (selectedDate) {
                const date = new Date(`${selectedDate}T09:00`);
                setScheduledAt(date.toISOString().slice(0, 16));
            } else {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(9, 0, 0, 0);
                setScheduledAt(tomorrow.toISOString().slice(0, 16));
            }
            setStatus('draft');
            setTags('');
        }
        setError(null);
    }, [post, selectedDate, open]);

    const formTitle = post ? 'Редагувати пост' : 'Новий пост для соцмереж';
    const isValid = title.trim() !== '' && content.trim() !== '' && scheduledAt.trim() !== '';

    const handleSave = async () => {
        if (!isValid) {
            setError('Заповніть назву, контент та дату публікації.');
            return;
        }

        setIsSaving(true);
        setError(null);

        const postData = {
            _id: post?._id,
            title: title.trim(),
            content: content.trim(),
            channel: channel as SocialPost['channel'],
            scheduledAt: new Date(scheduledAt).toISOString(),
            status,
            tags: tags
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean),
            generatedByAI: false,
        };

        try {
            await onSave(postData);
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Помилка збереження поста.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!open) return null;

    return (
        <div className={styles.modalBackdrop}>
            <div className={styles.modal}>
                <div className={styles.modalHeader}>
                    <div>
                        <h2>{formTitle}</h2>
                        <p>Створіть або редагуйте запланований пост.</p>
                    </div>
                    <button type="button" onClick={onClose} className={styles.closeButton}>
                        ✕
                    </button>
                </div>

                <div className={styles.modalBody}>
                    <div className={styles.fieldRow}>
                        <Input
                            label="Заголовок"
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            placeholder="Наприклад: Святкова акція для родини"
                        />
                        <Select
                            label="Канал"
                            options={channelOptions}
                            value={channel}
                            onChange={(event) => setChannel(event.target.value)}
                        />
                    </div>

                    <div className={styles.fieldRow}>
                        <Input
                            label="Дата і час публікації"
                            type="datetime-local"
                            value={scheduledAt}
                            onChange={(event) => setScheduledAt(event.target.value)}
                        />
                        <Select
                            label="Статус"
                            options={statusOptions}
                            value={status}
                            onChange={(event) => setStatus(event.target.value as typeof status)}
                        />
                    </div>

                    <Textarea
                        label="Контент"
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        placeholder="Напишіть текст поста."
                        minLength={0}
                        resize="vertical"
                        style={{ minHeight: '200px' }}
                    />

                    <Input
                        label="Теги"
                        value={tags}
                        onChange={(event) => setTags(event.target.value)}
                        placeholder="Наприклад: акція, дитячий центр, розваги"
                    />

                    {error && <div className={styles.errorText}>{error}</div>}
                </div>

                <div className={styles.modalFooter}>
                    <Button variant="outline" onClick={onClose}>Скасувати</Button>
                    <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
                        Зберегти пост
                    </Button>
                </div>
            </div>
        </div>
    );
}
