"use client";

import React, { useState, useEffect, useMemo } from "react";
import styles from "./StockForecastSection.module.css";
import { Preloader } from "../ui/Preloader";
import { useToast } from "../ui/ToastContext";

interface ForecastEvent {
    id: string;
    title: string;
    date: string;
    status: string;
    qty: number;
}

interface ForecastItem {
    ingId: string;
    name: string;
    unit: string;
    currentBalance: number;
    demand: {
        total: number;
        confirmed: number;
        draft: number;
    };
    shortage: {
        total: number;
        confirmed: number;
    };
    events: ForecastEvent[];
}

type SortKey = 'name' | 'currentBalance' | 'demand' | 'shortage';

export function StockForecastSection() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ForecastItem[]>([]);
    const [days, setDays] = useState(7);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>({ key: 'shortage', direction: 'desc' });
    const toast = useToast();

    async function fetchForecast() {
        setLoading(true);
        try {
            const res = await fetch(`/api/analytics/stock-forecast?days=${days}`);
            const result = await res.json();
            if (result.success) {
                setData(result.data);
            } else {
                toast.error("Помилка отримання прогнозу");
            }
        } catch (e) {
            console.error(e);
            toast.error("Помилка з'єднання");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchForecast();
    }, [days]);

    const sortedData = useMemo(() => {
        let sortableItems = [...data];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue: any;
                let bValue: any;

                switch (sortConfig.key) {
                    case 'name':
                        aValue = a.name;
                        bValue = b.name;
                        break;
                    case 'currentBalance':
                        aValue = a.currentBalance;
                        bValue = b.currentBalance;
                        break;
                    case 'demand':
                        aValue = a.demand.total;
                        bValue = b.demand.total;
                        break;
                    case 'shortage':
                        aValue = a.shortage.total;
                        bValue = b.shortage.total;
                        break;
                    default:
                        aValue = 0;
                        bValue = 0;
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [data, sortConfig]);

    const requestSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: SortKey) => {
        if (!sortConfig || sortConfig.key !== key) return null;
        return <span style={{ fontSize: '10px', marginLeft: '4px' }}>{sortConfig.direction === 'desc' ? '▼' : '▲'}</span>;
    };

    // Calculate summaries
    const shortagesCount = data.filter(item => item.shortage.total > 0).length;
    const criticalShortagesCount = data.filter(item => item.shortage.confirmed > 0).length;
    const uniqueEvents = new Set(data.flatMap(item => item.events.map(e => e.id))).size;

    if (loading) return <div className={styles.loading}>Аналізуємо інгредієнти...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.titleArea}>
                    <h2 className={styles.title}>Інтелектуальний прогноз залишків</h2>
                    <p className={styles.subtitle}>Аналіз потреб інгредієнтів на основі майбутніх свят</p>
                </div>
                <div className={styles.controls}>
                    <span className={styles.controlLabel}>Період:</span>
                    <select
                        className={styles.select}
                        value={days}
                        onChange={(e) => setDays(parseInt(e.target.value))}
                    >
                        <option value={3}>3 дні</option>
                        <option value={7}>7 днів</option>
                        <option value={14}>14 днів</option>
                        <option value={30}>30 днів</option>
                    </select>
                    <button onClick={fetchForecast} className={styles.refreshBtn} title="Оновити дані">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /></svg>
                    </button>
                </div>
            </div>

            <div className={styles.summaryGrid}>
                <div className={`${styles.summaryCard} glass-card`} style={{ borderLeft: '6px solid #f43f5e' }}>
                    <span className={styles.summaryLabel}>Критичний дефіцит</span>
                    <span className={styles.summaryValue} style={{ color: '#e11d48' }}>{criticalShortagesCount}</span>
                </div>
                <div className={`${styles.summaryCard} glass-card`} style={{ borderLeft: '6px solid #f59e0b' }}>
                    <span className={styles.summaryLabel}>Загальний дефіцит</span>
                    <span className={styles.summaryValue} style={{ color: '#d97706' }}>{shortagesCount}</span>
                </div>
                <div className={`${styles.summaryCard} glass-card`} style={{ borderLeft: '6px solid #6366f1' }}>
                    <span className={styles.summaryLabel}>Майбутніх подій</span>
                    <span className={styles.summaryValue} style={{ color: '#4f46e5' }}>{uniqueEvents}</span>
                </div>
                <div className={`${styles.summaryCard} glass-card`} style={{ borderLeft: '6px solid #10b981' }}>
                    <span className={styles.summaryLabel}>Прогноз на</span>
                    <div className={styles.summaryValue} style={{ color: '#166534', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        {days}
                        <span style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b' }}>днів</span>
                    </div>
                </div>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th onClick={() => requestSort('name')} className={styles.sortable}>
                                Інгредієнт {getSortIndicator('name')}
                            </th>
                            <th onClick={() => requestSort('currentBalance')} className={styles.sortable}>
                                На складі {getSortIndicator('currentBalance')}
                            </th>
                            <th onClick={() => requestSort('demand')} className={styles.sortable}>
                                Потреба {getSortIndicator('demand')}
                            </th>
                            <th onClick={() => requestSort('shortage')} className={styles.sortable}>
                                Статус {getSortIndicator('shortage')}
                            </th>
                            <th>Події (найближчі)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.length === 0 ? (
                            <tr>
                                <td colSpan={5} className={styles.emptyState}>
                                    <div style={{ opacity: 0.5, marginBottom: '10px' }}>
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                    </div>
                                    Немає даних для прогнозу на цей період
                                </td>
                            </tr>
                        ) : (
                            sortedData.map((item) => (
                                <tr key={item.ingId}>
                                    <td>
                                        <div className={styles.ingredientCell}>
                                            <span className={styles.ingredientName}>{item.name}</span>
                                            <span className={styles.unit}>{item.unit}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={styles.balanceValue}>{item.currentBalance.toFixed(2)}</span>
                                    </td>
                                    <td>
                                        <div className={styles.demandBox}>
                                            <span className={styles.demandMain}>{item.demand.confirmed.toFixed(1)}</span>
                                            {item.demand.draft > 0 && (
                                                <span className={styles.demandDraft}>+{item.demand.draft.toFixed(1)} (чернетки)</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        {item.shortage.total > 0 ? (
                                            <span className={`${styles.badge} ${item.shortage.confirmed > 0 ? styles.badgeCritical : styles.badgeWarning}`}>
                                                {item.shortage.confirmed > 0 ? 'Критично: ' : 'Потрібно: '}
                                                -{item.shortage.total.toFixed(1)} {item.unit}
                                            </span>
                                        ) : (
                                            <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                Достатньо
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <div className={styles.eventsStack}>
                                            {item.events.slice(0, 2).map((ev, i) => (
                                                <div key={i} className={styles.eventMiniCard}>
                                                    <div className={styles.eventInfo}>
                                                        <span className={styles.eventTitle}>{ev.title}</span>
                                                        <span className={styles.eventMeta}>{ev.date.split('-').reverse().slice(0, 2).join('.')}</span>
                                                    </div>
                                                    <span className={`${styles.eventQty} ${ev.status === 'confirmed' ? styles.qtyConfirmed : styles.qtyDraft}`}>
                                                        {ev.qty.toFixed(1)}
                                                    </span>
                                                </div>
                                            ))}
                                            {item.events.length > 2 && (
                                                <div style={{ fontSize: '10px', color: 'var(--gray-400)', paddingLeft: '8px' }}>
                                                    + ще {item.events.length - 2} заходи
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
