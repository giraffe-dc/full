"use client";

import { useMemo, useState } from 'react';
import type { SocialPost } from '@/types/social';
import styles from './social-planner.module.css';

interface CalendarWidgetProps {
    posts: SocialPost[];
    selectedDate?: string;
    onSelectDate?: (date: string) => void;
    onPostClick?: (post: SocialPost) => void;
    onEmptyCellClick?: (date: string) => void;
    showNavigation?: boolean;
    compact?: boolean;
}

const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

const formatDateKey = (value: Date) => {
    const year = value.getFullYear();
    const month = `0${value.getMonth() + 1}`.slice(-2);
    const day = `0${value.getDate()}`.slice(-2);
    return `${year}-${month}-${day}`;
};

const statusColorMap: Record<string, string> = {
    draft: '#8B7355',
    scheduled: '#4169E1',
    published: '#228B22',
};

export function CalendarWidget({
    posts,
    selectedDate,
    onSelectDate,
    onPostClick,
    onEmptyCellClick,
    showNavigation = true,
    compact = false,
}: CalendarWidgetProps) {
    const [monthOffset, setMonthOffset] = useState(0);

    const mapByDate = useMemo(() => {
        const map = new Map<string, SocialPost[]>();
        posts.forEach((post) => {
            const dateKey = post.scheduledAt.slice(0, 10);
            const existing = map.get(dateKey) || [];
            existing.push(post);
            map.set(dateKey, existing);
        });
        return map;
    }, [posts]);

    const calendar = useMemo(() => {
        const base = new Date();
        base.setDate(1);
        base.setMonth(base.getMonth() + monthOffset);

        const year = base.getFullYear();
        const month = base.getMonth();
        const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
        const firstCell = new Date(year, month, 1 - firstWeekday);

        const days = Array.from({ length: 42 }, (_, index) => {
            const date = new Date(firstCell);
            date.setDate(firstCell.getDate() + index);
            const key = formatDateKey(date);
            const dayPosts = mapByDate.get(key) || [];
            
            // Статистика по статусах
            const statsByStatus = {
                draft: dayPosts.filter(p => p.status === 'draft').length,
                scheduled: dayPosts.filter(p => p.status === 'scheduled').length,
                published: dayPosts.filter(p => p.status === 'published').length,
            };

            return {
                date,
                key,
                inMonth: date.getMonth() === month,
                posts: dayPosts,
                statsByStatus,
            };
        });

        return {
            days,
            label: new Intl.DateTimeFormat('uk-UA', { month: 'long', year: 'numeric' }).format(base),
            month,
            year,
        };
    }, [mapByDate, monthOffset]);

    const todayKey = formatDateKey(new Date());
    const activeDate = selectedDate || todayKey;

    const handleCellClick = (e: React.MouseEvent, dateKey: string, hasContent: boolean) => {
        e.stopPropagation();
        if (!hasContent) {
            onEmptyCellClick?.(dateKey);
        }
        onSelectDate?.(dateKey);
    };

    return (
        <div className={`${styles.calendarWidget} ${compact ? styles.calendarCompact : ''}`}>
            <div className={styles.calendarHeader}>
                <div className={styles.calendarTitle}>{calendar.label}</div>
                {showNavigation && (
                    <div className={styles.calendarControls}>
                        <button
                            type="button"
                            className={styles.calendarNavButton}
                            onClick={() => setMonthOffset((value) => value - 1)}
                        >
                            ‹
                        </button>
                        <button
                            type="button"
                            className={styles.calendarNavButton}
                            onClick={() => setMonthOffset(0)}
                        >
                            Сьогодні
                        </button>
                        <button
                            type="button"
                            className={styles.calendarNavButton}
                            onClick={() => setMonthOffset((value) => value + 1)}
                        >
                            ›
                        </button>
                    </div>
                )}
            </div>

            <div className={styles.calendarGrid}> 
                {weekdays.map((day) => (
                    <div key={day} className={styles.calendarDayName}>
                        {day}
                    </div>
                ))}
                {calendar.days.map((cell) => {
                    const isToday = cell.key === todayKey;
                    const isSelected = cell.key === activeDate;
                    const hasEvents = cell.posts.length > 0;

                    return (
                        <div
                            key={cell.key}
                            className={
                                `${styles.calendarCell} ${!cell.inMonth ? styles.calendarCellInactive : ''} ${isToday ? styles.calendarCellToday : ''} ${isSelected ? styles.calendarCellSelected : ''}`
                            }
                            onClick={(e) => handleCellClick(e, cell.key, hasEvents)}
                        >
                            <div className={styles.calendarCellHeader}>
                                <span className={styles.calendarCellNumber}>{cell.date.getDate()}</span>
                                {hasEvents && (
                                    <div className={styles.calendarCellStats}>
                                        {cell.statsByStatus.draft > 0 && (
                                            <span className={styles.statBadge} style={{ backgroundColor: statusColorMap.draft }} title={`Чернетка: ${cell.statsByStatus.draft}`}>
                                                {cell.statsByStatus.draft}
                                            </span>
                                        )}
                                        {cell.statsByStatus.scheduled > 0 && (
                                            <span className={styles.statBadge} style={{ backgroundColor: statusColorMap.scheduled }} title={`Заплановано: ${cell.statsByStatus.scheduled}`}>
                                                {cell.statsByStatus.scheduled}
                                            </span>
                                        )}
                                        {cell.statsByStatus.published > 0 && (
                                            <span className={styles.statBadge} style={{ backgroundColor: statusColorMap.published }} title={`Опубліковано: ${cell.statsByStatus.published}`}>
                                                {cell.statsByStatus.published}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                            {hasEvents && (
                                <div className={styles.calendarPostsList}>
                                    {cell.posts.slice(0, 2).map((post) => (
                                        <button
                                            key={post._id}
                                            type="button"
                                            className={styles.calendarPostItem}
                                            style={{ borderLeftColor: statusColorMap[post.status] || '#666' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onPostClick?.(post);
                                            }}
                                            title={`${post.title} (${post.status})`}
                                        >
                                            <span className={styles.calendarPostItemTitle}>{post.title}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {!compact && (
                <div className={styles.calendarLegend}>
                    <div className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ backgroundColor: statusColorMap.draft }} /> Чернетка
                    </div>
                    <div className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ backgroundColor: statusColorMap.scheduled }} /> Заплановано
                    </div>
                    <div className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ backgroundColor: statusColorMap.published }} /> Опубліковано
                    </div>
                </div>
            )}
        </div>
    );
}
