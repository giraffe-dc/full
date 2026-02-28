"use client";

import React, { useEffect, useState } from "react";
import styles from "./PnLSection.module.css";

interface CategoryItem {
    name: string;
    amount: number;
}

interface DailyPoint {
    dateKey: string;
    income: number;
    expense: number;
    profit: number;
}

interface PnLData {
    revenue: { total: number; categories: CategoryItem[] };
    cogs: { total: number; categories: CategoryItem[] };
    grossProfit: number;
    opex: { total: number; categories: CategoryItem[] };
    operatingProfit: number;
    netProfit: number;
    dailyStats: DailyPoint[];
}

interface PnLSectionProps {
    filters: { startDate: string; endDate: string };
    onFilterChange: (key: string, value: string) => void;
}

function formatCurrency(value: number): string {
    return value.toLocaleString("uk-UA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }) + " ₴";
}

function formatPercent(value: number, total: number): string {
    if (!total) return "0%";
    return ((value / total) * 100).toFixed(1) + "%";
}

export function PnLSection({ filters, onFilterChange }: PnLSectionProps) {
    const [data, setData] = useState<PnLData | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        new Set(["revenue", "cogs", "opex"])
    );

    useEffect(() => {
        async function fetchPnL() {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (filters.startDate) params.append("startDate", filters.startDate);
                if (filters.endDate) params.append("endDate", filters.endDate);
                const res = await fetch(`/api/accounting/pnl?${params.toString()}`);
                const json = await res.json();
                setData(json);
            } catch (e) {
                console.error("Failed to fetch P&L data:", e);
            } finally {
                setLoading(false);
            }
        }
        fetchPnL();
    }, [filters.startDate, filters.endDate]);

    const toggleSection = (id: string) => {
        const next = new Set(expandedSections);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedSections(next);
    };

    if (loading) {
        return <div className={styles.loadingState}>Завантаження P&L звіту...</div>;
    }

    if (!data) {
        return <div className={styles.emptyState}>Не вдалося завантажити дані</div>;
    }

    const marginPercent = data.revenue.total
        ? ((data.netProfit / data.revenue.total) * 100).toFixed(1)
        : "0";

    const maxDailyValue = Math.max(
        ...data.dailyStats.map((s) => Math.max(s.income, s.expense, Math.abs(s.profit))),
        1
    );

    return (
        <div className={styles.pnlContainer}>
            {/* Filters */}
            <div className={styles.filterBar}>
                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>Початок</label>
                    <input
                        type="date"
                        className={styles.filterInput}
                        value={filters.startDate}
                        onChange={(e) => onFilterChange("startDate", e.target.value)}
                    />
                </div>
                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>Кінець</label>
                    <input
                        type="date"
                        className={styles.filterInput}
                        value={filters.endDate}
                        onChange={(e) => onFilterChange("endDate", e.target.value)}
                    />
                </div>
            </div>

            {/* Hero Cards */}
            <div className={styles.heroGrid}>
                <div className={`${styles.heroCard} ${styles.heroCardRevenue}`}>
                    <span className={styles.heroLabel}>Загальний дохід</span>
                    <span className={`${styles.heroValue} ${styles.incomeText}`}>
                        {formatCurrency(data.revenue.total)}
                    </span>
                    <span className={styles.heroSub}>
                        {data.revenue.categories.length} категорій
                    </span>
                </div>
                <div className={`${styles.heroCard} ${styles.heroCardExpense}`}>
                    <span className={styles.heroLabel}>Загальні витрати</span>
                    <span className={`${styles.heroValue} ${styles.expenseText}`}>
                        {formatCurrency(data.cogs.total + data.opex.total)}
                    </span>
                    <span className={styles.heroSub}>
                        COGS: {formatCurrency(data.cogs.total)} + OPEX: {formatCurrency(data.opex.total)}
                    </span>
                </div>
                <div className={`${styles.heroCard} ${styles.heroCardProfit}`}>
                    <span className={styles.heroLabel}>Чистий прибуток</span>
                    <span
                        className={`${styles.heroValue} ${data.netProfit >= 0 ? styles.profitPos : styles.profitNeg}`}
                    >
                        {formatCurrency(data.netProfit)}
                    </span>
                    <span className={styles.heroSub}>
                        Маржа: {marginPercent}%
                    </span>
                </div>
            </div>

            {/* P&L Table */}
            <div className={styles.pnlCard}>
                <div className={styles.pnlCardHeader}>
                    <h3 className={styles.pnlCardTitle}>Звіт про прибутки та збитки (P&L)</h3>
                </div>
                <table className={styles.pnlTable}>
                    <thead>
                        <tr>
                            <th>Стаття</th>
                            <th>Сума</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* REVENUE */}
                        <tr
                            className={styles.sectionHeader}
                            onClick={() => toggleSection("revenue")}
                        >
                            <td>
                                <span
                                    className={`${styles.sectionIcon} ${expandedSections.has("revenue") ? styles.sectionIconExpanded : ""}`}
                                >
                                    ▶
                                </span>
                                📈 Доходи (Revenue)
                            </td>
                            <td className={`${styles.amount} ${styles.positiveAmount}`}>
                                {formatCurrency(data.revenue.total)}
                            </td>
                        </tr>
                        {expandedSections.has("revenue") &&
                            data.revenue.categories.map((cat) => (
                                <tr key={cat.name} className={styles.categoryRow}>
                                    <td>{cat.name}</td>
                                    <td className={styles.amount}>{formatCurrency(cat.amount)}</td>
                                </tr>
                            ))}

                        {/* COGS */}
                        <tr
                            className={`${styles.sectionHeader} ${styles.sectionHeaderCogs}`}
                            onClick={() => toggleSection("cogs")}
                        >
                            <td>
                                <span
                                    className={`${styles.sectionIcon} ${expandedSections.has("cogs") ? styles.sectionIconExpanded : ""}`}
                                >
                                    ▶
                                </span>
                                📦 Собівартість (COGS)
                            </td>
                            <td className={`${styles.amount} ${styles.negativeAmount}`}>
                                −{formatCurrency(data.cogs.total)}
                            </td>
                        </tr>
                        {expandedSections.has("cogs") &&
                            data.cogs.categories.map((cat) => (
                                <tr key={cat.name} className={styles.categoryRow}>
                                    <td>{cat.name}</td>
                                    <td className={`${styles.amount} ${styles.negativeAmount}`}>
                                        {formatCurrency(cat.amount)}
                                    </td>
                                </tr>
                            ))}

                        {/* GROSS PROFIT */}
                        <tr className={`${styles.subtotalRow} ${styles.grossProfit}`}>
                            <td>
                                💰 Валовий прибуток (Gross Profit)
                                <span
                                    className={`${styles.marginBadge} ${data.grossProfit >= 0 ? styles.marginBadgePos : styles.marginBadgeNeg}`}
                                >
                                    {formatPercent(data.grossProfit, data.revenue.total)}
                                </span>
                            </td>
                            <td className={styles.amount}>{formatCurrency(data.grossProfit)}</td>
                        </tr>

                        {/* OPEX */}
                        <tr
                            className={`${styles.sectionHeader} ${styles.sectionHeaderExpense}`}
                            onClick={() => toggleSection("opex")}
                        >
                            <td>
                                <span
                                    className={`${styles.sectionIcon} ${expandedSections.has("opex") ? styles.sectionIconExpanded : ""}`}
                                >
                                    ▶
                                </span>
                                📊 Операційні витрати (OPEX)
                            </td>
                            <td className={`${styles.amount} ${styles.negativeAmount}`}>
                                −{formatCurrency(data.opex.total)}
                            </td>
                        </tr>
                        {expandedSections.has("opex") &&
                            data.opex.categories.map((cat) => (
                                <tr key={cat.name} className={styles.categoryRow}>
                                    <td>{cat.name}</td>
                                    <td className={`${styles.amount} ${styles.negativeAmount}`}>
                                        {formatCurrency(cat.amount)}
                                    </td>
                                </tr>
                            ))}

                        {/* OPERATING PROFIT */}
                        <tr className={`${styles.subtotalRow} ${styles.operatingProfit}`}>
                            <td>
                                📋 Операційний прибуток
                                <span
                                    className={`${styles.marginBadge} ${data.operatingProfit >= 0 ? styles.marginBadgePos : styles.marginBadgeNeg}`}
                                >
                                    {formatPercent(data.operatingProfit, data.revenue.total)}
                                </span>
                            </td>
                            <td className={styles.amount}>
                                {formatCurrency(data.operatingProfit)}
                            </td>
                        </tr>

                        {/* NET PROFIT */}
                        <tr
                            className={`${styles.subtotalRow} ${data.netProfit >= 0 ? styles.netProfit : styles.netProfitNeg}`}
                        >
                            <td>
                                ✅ Чистий прибуток (Net Profit)
                                <span
                                    className={`${styles.marginBadge} ${data.netProfit >= 0 ? styles.marginBadgePos : styles.marginBadgeNeg}`}
                                >
                                    {marginPercent}%
                                </span>
                            </td>
                            <td className={styles.amount}>
                                {formatCurrency(data.netProfit)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Daily Trend Chart */}
            {data.dailyStats.length > 0 && (
                <div className={styles.chartCard}>
                    <div className={styles.chartHeader}>
                        <h3 className={styles.chartTitle}>Динаміка по днях</h3>
                        <div className={styles.chartLegend}>
                            <span>
                                <span className={`${styles.legendDot} ${styles.legendIncome}`} />
                                Дохід
                            </span>
                            <span>
                                <span className={`${styles.legendDot} ${styles.legendExpense}`} />
                                Витрати
                            </span>
                            <span>
                                <span className={`${styles.legendDot} ${styles.legendProfit}`} />
                                Прибуток
                            </span>
                        </div>
                    </div>
                    <div className={styles.timelineScroll}>
                        <ul className={styles.timelineList}>
                            {data.dailyStats.map((day) => (
                                <li key={day.dateKey} className={styles.timelineItem}>
                                    <span className={styles.timelineDate}>
                                        {new Date(day.dateKey).toLocaleDateString("uk-UA", {
                                            day: "2-digit",
                                            month: "2-digit",
                                        })}
                                    </span>
                                    <div className={styles.timelineGraph}>
                                        <div
                                            className={`${styles.graphBar} ${styles.inc}`}
                                            style={{
                                                height: `${Math.max((day.income / maxDailyValue) * 150, 2)}px`,
                                            }}
                                        />
                                        <div
                                            className={`${styles.graphBar} ${styles.exp}`}
                                            style={{
                                                height: `${Math.max((day.expense / maxDailyValue) * 150, 2)}px`,
                                            }}
                                        />
                                        <div
                                            className={`${styles.graphBar} ${styles.prof}`}
                                            style={{
                                                height: `${Math.max((Math.abs(day.profit) / maxDailyValue) * 150, 2)}px`,
                                            }}
                                        />
                                    </div>
                                    <div className={styles.timelineValues}>
                                        <span className={styles.valInc}>
                                            {(day.income / 1000).toFixed(1)}k
                                        </span>
                                        <span className={styles.valExp}>
                                            {(day.expense / 1000).toFixed(1)}k
                                        </span>
                                        <span className={styles.valProf}>
                                            {(day.profit / 1000).toFixed(1)}k
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}
