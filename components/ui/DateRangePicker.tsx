"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import styles from './DateRangePicker.module.css';

interface DateRangePickerProps {
    startDate: string;
    endDate: string;
    onChange: (start: string, end: string) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ startDate, endDate, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(new Date(startDate || new Date()));
    const [tempStart, setTempStart] = useState<Date | null>(startDate ? new Date(startDate) : null);
    const [tempEnd, setTempEnd] = useState<Date | null>(endDate ? new Date(endDate) : null);
    const popoverRef = useRef<HTMLDivElement>(null);

    const presets = [
        { label: 'Сьогодні', getRange: () => [new Date(), new Date()] },
        {
            label: 'Вчора', getRange: () => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                return [yesterday, yesterday];
            }
        },
        {
            label: 'Останні 7 днів', getRange: () => {
                const start = new Date();
                start.setDate(start.getDate() - 6);
                return [start, new Date()];
            }
        },
        {
            label: 'Останні 30 днів', getRange: () => {
                const start = new Date();
                start.setDate(start.getDate() - 29);
                return [start, new Date()];
            }
        },
        { label: 'Січень', getRange: () => [new Date(2026, 0, 1), new Date(2026, 0, 31)] },
        { label: 'Грудень', getRange: () => [new Date(2025, 11, 1), new Date(2025, 11, 31)] },
        { label: 'За весь час', getRange: () => [new Date(2024, 0, 1), new Date()] },
    ];

    const handlePresetClick = (getRange: () => (Date | null)[]) => {
        const [s, e] = getRange();
        if (s && e) {
            setTempStart(s);
            setTempEnd(e);
            onChange(s.toISOString().split('T')[0], e.toISOString().split('T')[0]);
            setIsOpen(false);
        }
    };

    const isSameDay = (d1: Date, d2: Date) =>
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();

    const isBetween = (day: Date, start: Date, end: Date) =>
        day > start && day < end;

    const renderCalendar = (monthDate: Date) => {
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Start from Monday
        let startDay = firstDay.getDay();
        if (startDay === 0) startDay = 7;
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        const days = [];
        // Prev month days
        for (let i = startDay - 1; i > 0; i--) {
            days.push({ day: daysInPrevMonth - i + 1, month: month - 1, year, isOther: true });
        }
        // Current month days
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push({ day: i, month: month, year, isOther: false });
        }
        // Next month teaser
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({ day: i, month: month + 1, year, isOther: true });
        }

        const monthNames = ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень", "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"];

        return (
            <div className={styles.calendar}>
                <div className={styles.calendarHeader}>
                    <button className={styles.navBtn} onClick={() => setViewDate(new Date(year, month - 1, 1))}>&lt;</button>
                    <span className={styles.monthTitle}>{monthNames[month]} {year}</span>
                    <button className={styles.navBtn} onClick={() => setViewDate(new Date(year, month + 1, 1))}>&gt;</button>
                </div>
                <div className={styles.weekDays}>
                    {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map(d => <div key={d} className={styles.weekDay}>{d}</div>)}
                </div>
                <div className={styles.daysGrid}>
                    {days.map((dObj, idx) => {
                        const date = new Date(dObj.year, dObj.month, dObj.day);
                        const isSelectedStart = tempStart && isSameDay(date, tempStart);
                        const isSelectedEnd = tempEnd && isSameDay(date, tempEnd);
                        const inRange = tempStart && tempEnd && isBetween(date, tempStart, tempEnd);
                        const isToday = isSameDay(date, new Date());

                        let dayClasses = styles.day;
                        if (dObj.isOther) dayClasses += ` ${styles.otherMonth}`;
                        if (isSelectedStart || isSelectedEnd) dayClasses += ` ${styles.selected}`;
                        if (inRange) dayClasses += ` ${styles.inRange}`;
                        if (isToday) dayClasses += ` ${styles.today}`;

                        return (
                            <div
                                key={idx}
                                className={dayClasses}
                                onClick={() => {
                                    if (dObj.isOther) return;
                                    if (!tempStart || (tempStart && tempEnd)) {
                                        setTempStart(date);
                                        setTempEnd(null);
                                    } else if (date < tempStart) {
                                        setTempStart(date);
                                    } else {
                                        setTempEnd(date);
                                    }
                                }}
                            >
                                {dObj.day}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const formattedLabel = useMemo(() => {
        if (!startDate) return "Оберіть період";
        const s = new Date(startDate);
        const e = new Date(endDate);
        if (isSameDay(s, e)) {
            return s.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
        }
        return `${s.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })} - ${e.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}`;
    }, [startDate, endDate]);

    const handleApply = () => {
        if (tempStart && tempEnd) {
            onChange(tempStart.toISOString().split('T')[0], tempEnd.toISOString().split('T')[0]);
            setIsOpen(false);
        } else if (tempStart) {
            onChange(tempStart.toISOString().split('T')[0], tempStart.toISOString().split('T')[0]);
            setIsOpen(false);
        }
    };

    return (
        <div className={styles.container}>
            <button className={styles.trigger} onClick={() => setIsOpen(!isOpen)}>
                📅 {formattedLabel}
            </button>

            {isOpen && (
                <>
                    <div className={styles.overlay} onClick={() => setIsOpen(false)} />
                    <div className={styles.popover} ref={popoverRef}>
                        <div className={styles.presets}>
                            {presets.map(p => (
                                <button
                                    key={p.label}
                                    className={`${styles.presetBtn}`}
                                    onClick={() => handlePresetClick(p.getRange)}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                        <div className={styles.calendarWrapper}>
                            <div className={styles.calendars}>
                                {renderCalendar(viewDate)}
                                {renderCalendar(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                            </div>
                            <div className={styles.footer}>
                                <button className={styles.cancelBtn} onClick={() => setIsOpen(false)}>Скасувати</button>
                                <button className={styles.applyBtn} onClick={handleApply}>Застосувати</button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
