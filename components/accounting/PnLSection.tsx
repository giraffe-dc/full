"use client";

import React, { useEffect, useState } from "react";
import styles from "./PnLSection.module.css";
import {
    PnLData,
    PnLComparison,
    FinancialRatios,
    ComparisonPeriod,
    BudgetWithTotals,
    BudgetItem,
    CategoryItem,
} from "../../types/accounting";
import { BudgetModal } from "./BudgetModal";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    Legend,
} from "recharts";

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

function formatPercent(value: number): string {
    return value.toFixed(1) + "%";
}

function formatVariancePercent(value: number): string {
    const sign = value >= 0 ? "+" : "";
    return sign + value.toFixed(1) + "%";
}

// Variance indicator component
function VarianceIndicator({
    value,
    inverse,
}: {
    value: number;
    inverse?: boolean;
}) {
    const isPositive = value >= 0;
    const effective = inverse ? !isPositive : isPositive;
    const colorClass = effective ? styles.variancePos : styles.varianceNeg;
    const icon = effective ? "▲" : "▼";

    return (
        <span className={`${styles.varianceBadge} ${colorClass}`}>
            {icon} {formatVariancePercent(Math.abs(value))}
        </span>
    );
}

export function PnLSection({ filters, onFilterChange }: PnLSectionProps) {
    const [data, setData] = useState<PnLData | null>(null);
    const [financialRatios, setFinancialRatios] = useState<FinancialRatios | null>(null);
    const [comparison, setComparison] = useState<PnLComparison | null>(null);
    const [comparisonPeriod, setComparisonPeriod] =
        useState<ComparisonPeriod>("none");
    const [budget, setBudget] = useState<BudgetWithTotals | null>(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [budgetModalOpen, setBudgetModalOpen] = useState(false);
    const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        new Set(["revenue", "cogs", "opex"])
    );

    // Fetch expense categories for budget
    useEffect(() => {
        async function fetchCategories() {
            try {
                const res = await fetch("/api/accounting/categories/expense");
                if (res.ok) {
                    const json = await res.json();
                    const categories = json.data?.map((c: any) => c.name) || [];
                    setExpenseCategories(categories);
                }
            } catch (e) {
                console.error("Failed to fetch categories:", e);
            }
        }
        fetchCategories();
    }, []);

    useEffect(() => {
        async function fetchPnL() {
            setLoading(true);
            setError(null);
            try {
                const params = new URLSearchParams();
                if (filters.startDate) params.append("startDate", filters.startDate);
                if (filters.endDate) params.append("endDate", filters.endDate);
                if (comparisonPeriod !== "none") {
                    params.append("comparisonPeriod", comparisonPeriod);
                }

                console.log("Fetching P&L with params:", params.toString());
                const res = await fetch(`/api/accounting/pnl?${params.toString()}`);
                
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.error || `HTTP ${res.status}`);
                }

                const json = await res.json();
                console.log("P&L data received:", json);
                setData(json);
                setFinancialRatios(json.financialRatios || null);
                setComparison(json.comparison || null);
            } catch (e) {
                const errorMsg = e instanceof Error ? e.message : "Невідома помилка";
                console.error("Failed to fetch P&L data:", e);
                setError(errorMsg);
            } finally {
                setLoading(false);
            }
        }
        fetchPnL();
    }, [filters.startDate, filters.endDate, comparisonPeriod]);

    // Fetch budget data
    useEffect(() => {
        async function fetchBudget() {
            try {
                const startDate = filters.startDate
                    ? filters.startDate.substring(0, 7) // YYYY-MM
                    : new Date().toISOString().substring(0, 7);

                const res = await fetch(`/api/accounting/budgets?month=${startDate}`);
                if (res.ok) {
                    const json = await res.json();
                    setBudget(json);
                }
            } catch (e) {
                console.error("Failed to fetch budget:", e);
            }
        }
        fetchBudget();
    }, [filters.startDate]);

    const toggleSection = (id: string) => {
        const next = new Set(expandedSections);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedSections(next);
    };

    // Export to Excel
    const handleExport = async () => {
        if (!data) return;
        setExporting(true);
        try {
            const res = await fetch("/api/accounting/pnl/export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...data,
                    financialRatios,
                    comparison,
                    filters,
                }),
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `PNL_${filters.startDate}_to_${filters.endDate}.xlsx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
        } catch (e) {
            console.error("Export failed:", e);
        } finally {
            setExporting(false);
        }
    };

    // Save budget
    const handleSaveBudget = async (items: BudgetItem[]) => {
        const month = filters.startDate ? filters.startDate.substring(0, 7) : new Date().toISOString().substring(0, 7);
        const res = await fetch("/api/accounting/budgets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ month, items }),
        });

        if (res.ok) {
            // Refresh budget data
            const updatedRes = await fetch(`/api/accounting/budgets?month=${month}`);
            if (updatedRes.ok) {
                const json = await updatedRes.json();
                setBudget(json);
            }
        }
    };

    if (loading) {
        return <div className={styles.loadingState}>Завантаження P&L звіту...</div>;
    }

    if (error) {
        return (
            <div className={styles.errorState}>
                <h3>⚠️ Помилка завантаження даних</h3>
                <p>{error}</p>
                <button
                    className={styles.retryButton}
                    onClick={() => {
                        setError(null);
                        setLoading(true);
                        // Trigger refetch by toggling loading
                        setTimeout(() => setLoading(false), 100);
                    }}
                >
                    Спробувати знову
                </button>
            </div>
        );
    }

    if (!data) {
        return <div className={styles.emptyState}>Не вдалося завантажити дані</div>;
    }

    const marginPercent = data.revenue.total
        ? ((data.netProfit / data.revenue.total) * 100).toFixed(1)
        : "0";

    const maxDailyValue = Math.max(
        ...data.dailyStats.map((s) =>
            Math.max(s.income, s.expense, Math.abs(s.profit))
        ),
        1
    );

    // Get comparison label
    const getComparisonLabel = () => {
        if (comparisonPeriod === "previous") return "Попередній період";
        if (comparisonPeriod === "same_last_year") return "Минулий рік";
        return "";
    };

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
                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>Порівняння</label>
                    <select
                        className={styles.filterInput}
                        value={comparisonPeriod}
                        onChange={(e) =>
                            setComparisonPeriod(e.target.value as ComparisonPeriod)
                        }
                    >
                        <option value="none">Без порівняння</option>
                        <option value="previous">Попередній період</option>
                        <option value="same_last_year">Минулий рік (YoY)</option>
                    </select>
                </div>
                <div className={styles.filterActions}>
                    <button
                        className={styles.budgetButton}
                        onClick={() => setBudgetModalOpen(true)}
                    >
                        💰 Бюджет
                    </button>
                    <button
                        className={styles.exportButton}
                        onClick={handleExport}
                        disabled={exporting}
                    >
                        {exporting ? "Експорт..." : "📊 Експорт Excel"}
                    </button>
                </div>
            </div>

            {/* KPI Cards with Financial Ratios */}
            {financialRatios && (
                <div className={styles.kpiGrid}>
                    <div className={styles.kpiCard}>
                        <span className={styles.kpiLabel}>Валова маржа</span>
                        <span
                            className={`${styles.kpiValue} ${financialRatios.grossMarginPercent >= 50 ? styles.kpiGood : financialRatios.grossMarginPercent >= 30 ? styles.kpiMedium : styles.kpiBad}`}
                        >
                            {formatPercent(financialRatios.grossMarginPercent)}
                        </span>
                        <span className={styles.kpiSub}>Gross Margin</span>
                    </div>
                    <div className={styles.kpiCard}>
                        <span className={styles.kpiLabel}>Операційна маржа</span>
                        <span
                            className={`${styles.kpiValue} ${financialRatios.operatingMarginPercent >= 20 ? styles.kpiGood : financialRatios.operatingMarginPercent >= 10 ? styles.kpiMedium : styles.kpiBad}`}
                        >
                            {formatPercent(financialRatios.operatingMarginPercent)}
                        </span>
                        <span className={styles.kpiSub}>Operating Margin</span>
                    </div>
                    <div className={styles.kpiCard}>
                        <span className={styles.kpiLabel}>Чиста маржа</span>
                        <span
                            className={`${styles.kpiValue} ${financialRatios.netMarginPercent >= 15 ? styles.kpiGood : financialRatios.netMarginPercent >= 5 ? styles.kpiMedium : styles.kpiBad}`}
                        >
                            {formatPercent(financialRatios.netMarginPercent)}
                        </span>
                        <span className={styles.kpiSub}>Net Margin</span>
                    </div>
                    {comparison && (
                        <div className={styles.kpiCard}>
                            <span className={styles.kpiLabel}>
                                Зміна виручки
                            </span>
                            <span
                                className={`${styles.kpiValue} ${comparison.variancePercent.revenue >= 0 ? styles.kpiGood : styles.kpiBad}`}
                            >
                                {formatVariancePercent(comparison.variancePercent.revenue)}
                            </span>
                            <span className={styles.kpiSub}>{getComparisonLabel()}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Hero Cards */}
            <div className={styles.heroGrid}>
                <div className={`${styles.heroCard} ${styles.heroCardRevenue}`}>
                    <span className={styles.heroLabel}>Загальний дохід</span>
                    <div className={styles.heroValueWrapper}>
                        <span
                            className={`${styles.heroValue} ${styles.incomeText}`}
                        >
                            {formatCurrency(data.revenue.total)}
                        </span>
                        {comparison && (
                            <VarianceIndicator
                                value={comparison.variancePercent.revenue}
                            />
                        )}
                    </div>
                    <span className={styles.heroSub}>
                        {data.revenue.categories.length} категорій
                    </span>
                    {budget && (
                        <span className={styles.heroBudget}>
                            Бюджет: {formatCurrency(budget.totals.totalPlanned)}
                        </span>
                    )}
                </div>
                <div className={`${styles.heroCard} ${styles.heroCardExpense}`}>
                    <span className={styles.heroLabel}>Загальні витрати</span>
                    <div className={styles.heroValueWrapper}>
                        <span
                            className={`${styles.heroValue} ${styles.expenseText}`}
                        >
                            {formatCurrency(data.cogs.total + data.opex.total)}
                        </span>
                        {comparison && (
                            <VarianceIndicator
                                value={-comparison.variancePercent.opex}
                                inverse
                            />
                        )}
                    </div>
                    <span className={styles.heroSub}>
                        COGS: {formatCurrency(data.cogs.total)} + OPEX:{" "}
                        {formatCurrency(data.opex.total)}
                    </span>
                </div>
                <div className={`${styles.heroCard} ${styles.heroCardProfit}`}>
                    <span className={styles.heroLabel}>Чистий прибуток</span>
                    <div className={styles.heroValueWrapper}>
                        <span
                            className={`${styles.heroValue} ${data.netProfit >= 0 ? styles.profitPos : styles.profitNeg}`}
                        >
                            {formatCurrency(data.netProfit)}
                        </span>
                        {comparison && (
                            <VarianceIndicator
                                value={comparison.variancePercent.netProfit}
                            />
                        )}
                    </div>
                    <span className={styles.heroSub}>Маржа: {marginPercent}%</span>
                </div>
            </div>

            {/* Budget vs Actual Section */}
            {budget && budget.items.length > 0 && (
                <div className={styles.budgetCard}>
                    <div className={styles.budgetCardHeader}>
                        <h3 className={styles.budgetCardTitle}>
                            План-факт аналіз
                        </h3>
                        <span className={styles.budgetTotal}>
                            Виконання:{" "}
                            {(budget.totals.totalActual / budget.totals.totalPlanned) * 100 > 100
                                ? "❌"
                                : "✅"}{" "}
                            {(budget.totals.totalActual / budget.totals.totalPlanned * 100).toFixed(1)}%
                        </span>
                    </div>
                    <table className={styles.budgetTable}>
                        <thead>
                            <tr>
                                <th>Стаття</th>
                                <th>План</th>
                                <th>Факт</th>
                                <th>Відхилення</th>
                                <th>%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {budget.items.map((item) => (
                                <tr key={item.categoryId}>
                                    <td>{item.categoryName}</td>
                                    <td>{formatCurrency(item.plannedAmount)}</td>
                                    <td>{formatCurrency(item.actualAmount || 0)}</td>
                                    <td>
                                        <span
                                            className={
                                                (item.variance || 0) <= 0
                                                    ? styles.varianceOk
                                                    : styles.varianceOver
                                            }
                                        >
                                            {formatCurrency(item.variance || 0)}
                                        </span>
                                    </td>
                                    <td>
                                        <span
                                            className={
                                                (item.variancePercent || 0) <= 0
                                                    ? styles.varianceOk
                                                    : styles.varianceOver
                                            }
                                        >
                                            {formatPercent(item.variancePercent || 0)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* P&L Table */}
            <div className={styles.pnlCard}>
                <div className={styles.pnlCardHeader}>
                    <h3 className={styles.pnlCardTitle}>
                        Звіт про прибутки та збитки (P&L)
                    </h3>
                </div>
                <table className={styles.pnlTable}>
                    <thead>
                        <tr>
                            <th>Стаття</th>
                            <th>Сума</th>
                            {comparison && <th>Порівняння</th>}
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
                            {comparison && (
                                <td>
                                    <VarianceIndicator
                                        value={comparison.variancePercent.revenue}
                                    />
                                </td>
                            )}
                        </tr>
                        {expandedSections.has("revenue") &&
                            data.revenue.categories.map((cat) => (
                                <tr key={cat.name} className={styles.categoryRow}>
                                    <td>{cat.name}</td>
                                    <td className={styles.amount}>
                                        {formatCurrency(cat.amount)}
                                    </td>
                                    {comparison && <td>-</td>}
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
                                {data.cogs.details && (
                                    <span className={styles.cogsDetailBadge}>
                                        {data.cogs.details.recipeCOGS && data.cogs.details.recipeCOGS > 0 
                                            ? "📝 По рецептах" 
                                            : "📦 По залишках"}
                                    </span>
                                )}
                            </td>
                            <td
                                className={`${styles.amount} ${styles.negativeAmount}`}
                            >
                                −{formatCurrency(data.cogs.total)}
                            </td>
                            {comparison && (
                                <td>
                                    <VarianceIndicator
                                        value={-comparison.variancePercent.cogs}
                                        inverse
                                    />
                                </td>
                            )}
                        </tr>
                        {expandedSections.has("cogs") && (
                            <>
                                {data.cogs.details && (data.cogs.details.recipeCOGS ?? 0) > 0 ? (
                                    // Recipe-based COGS details
                                    <>
                                        <tr className={styles.cogsDetailRow}>
                                            <td>📝 Собівартість по рецептах</td>
                                            <td className={`${styles.amount} ${styles.negativeAmount}`}>
                                                −{formatCurrency(data.cogs.details.recipeCOGS ?? 0)}
                                            </td>
                                            {comparison && <td>-</td>}
                                        </tr>
                                    </>
                                ) : (
                                    // Stock-based COGS details
                                    <>
                                        <tr className={styles.cogsDetailRow}>
                                            <td>📦 Залишки на початок</td>
                                            <td className={styles.amount}>
                                                {formatCurrency(data.cogs.details?.openingStock ?? 0)}
                                            </td>
                                            {comparison && <td>-</td>}
                                        </tr>
                                        <tr className={styles.cogsDetailRow}>
                                            <td>🚚 Закупівлі за період</td>
                                            <td className={`${styles.amount} ${styles.negativeAmount}`}>
                                                −{formatCurrency(data.cogs.details?.purchases ?? 0)}
                                            </td>
                                            {comparison && <td>-</td>}
                                        </tr>
                                        <tr className={styles.cogsDetailRow}>
                                            <td>📦 Залишки на кінець</td>
                                            <td className={styles.amount}>
                                                −{formatCurrency(data.cogs.details?.closingStock ?? 0)}
                                            </td>
                                            {comparison && <td>-</td>}
                                        </tr>
                                        <tr className={`${styles.cogsDetailRow} ${styles.cogsTotalRow}`}>
                                            <td>💵 Собівартість проданих товарів</td>
                                            <td className={`${styles.amount} ${styles.negativeAmount}`}>
                                                −{formatCurrency(data.cogs.total)}
                                            </td>
                                            {comparison && <td>-</td>}
                                        </tr>
                                    </>
                                )}
                                {/* COGS by category */}
                                {data.cogs.categories.map((cat) => (
                                    <tr key={cat.name} className={styles.categoryRow}>
                                        <td>{cat.name}</td>
                                        <td className={`${styles.amount} ${styles.negativeAmount}`}>
                                            {formatCurrency(cat.amount)}
                                        </td>
                                        {comparison && <td>-</td>}
                                    </tr>
                                ))}
                            </>
                        )}

                        {/* GROSS PROFIT */}
                        <tr className={`${styles.subtotalRow} ${styles.grossProfit}`}>
                            <td>
                                💰 Валовий прибуток (Gross Profit)
                                <span
                                    className={`${styles.marginBadge} ${data.grossProfit >= 0 ? styles.marginBadgePos : styles.marginBadgeNeg}`}
                                >
                                    {financialRatios
                                        ? formatPercent(financialRatios.grossMarginPercent)
                                        : formatPercent(
                                              (data.grossProfit / data.revenue.total) * 100
                                          )}
                                </span>
                            </td>
                            <td className={styles.amount}>
                                {formatCurrency(data.grossProfit)}
                            </td>
                            {comparison && (
                                <td>
                                    <VarianceIndicator
                                        value={comparison.variancePercent.grossProfit}
                                    />
                                </td>
                            )}
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
                            <td
                                className={`${styles.amount} ${styles.negativeAmount}`}
                            >
                                −{formatCurrency(data.opex.total)}
                            </td>
                            {comparison && (
                                <td>
                                    <VarianceIndicator
                                        value={-comparison.variancePercent.opex}
                                        inverse
                                    />
                                </td>
                            )}
                        </tr>
                        {expandedSections.has("opex") &&
                            data.opex.categories.map((cat) => (
                                <tr key={cat.name} className={styles.categoryRow}>
                                    <td>{cat.name}</td>
                                    <td
                                        className={`${styles.amount} ${styles.negativeAmount}`}
                                    >
                                        {formatCurrency(cat.amount)}
                                    </td>
                                    {comparison && <td>-</td>}
                                </tr>
                            ))}

                        {/* OPERATING PROFIT */}
                        <tr className={`${styles.subtotalRow} ${styles.operatingProfit}`}>
                            <td>
                                📋 Операційний прибуток
                                <span
                                    className={`${styles.marginBadge} ${data.operatingProfit >= 0 ? styles.marginBadgePos : styles.marginBadgeNeg}`}
                                >
                                    {financialRatios
                                        ? formatPercent(financialRatios.operatingMarginPercent)
                                        : formatPercent(
                                              (data.operatingProfit / data.revenue.total) * 100
                                          )}
                                </span>
                            </td>
                            <td className={styles.amount}>
                                {formatCurrency(data.operatingProfit)}
                            </td>
                            {comparison && (
                                <td>
                                    <VarianceIndicator
                                        value={comparison.variancePercent.operatingProfit}
                                    />
                                </td>
                            )}
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
                            {comparison && (
                                <td>
                                    <VarianceIndicator
                                        value={comparison.variancePercent.netProfit}
                                    />
                                </td>
                            )}
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Daily Trend Chart with Recharts */}
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
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={data.dailyStats}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="dateKey"
                                    tickFormatter={(date) =>
                                        new Date(date).toLocaleDateString("uk-UA", {
                                            day: "2-digit",
                                            month: "2-digit",
                                        })
                                    }
                                    stroke="#6b7280"
                                    fontSize={12}
                                />
                                <YAxis
                                    stroke="#6b7280"
                                    fontSize={12}
                                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "white",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: "8px",
                                        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                                    }}
                                    formatter={(value: any) =>
                                        (typeof value === 'number' ? value : 0).toLocaleString("uk-UA", {
                                            style: "currency",
                                            currency: "UAH",
                                        })
                                    }
                                    labelFormatter={(label) =>
                                        new Date(label).toLocaleDateString("uk-UA", {
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "numeric",
                                        })
                                    }
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="income"
                                    name="Дохід"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    dot={false}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="expense"
                                    name="Витрати"
                                    stroke="#ef4444"
                                    strokeWidth={2}
                                    dot={false}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="profit"
                                    name="Прибуток"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    dot={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Revenue Structure Pie Chart */}
            {data.revenue.categories.length > 0 && (
                <div className={styles.chartCard}>
                    <div className={styles.chartHeader}>
                        <h3 className={styles.chartTitle}>Структура доходів</h3>
                    </div>
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={data.revenue.categories}
                                    dataKey="amount"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    label={({ name, percent }) =>
                                        `${name} (${((percent || 0) * 100).toFixed(1)}%)`
                                    }
                                    labelLine={true}
                                >
                                    {data.revenue.categories.map((_, index) => (
                                        <Cell
                                            key={index}
                                            fill={[
                                                "#10b981",
                                                "#3b82f6",
                                                "#8b5cf6",
                                                "#f59e0b",
                                                "#ef4444",
                                                "#06b6d4",
                                                "#ec4899",
                                                "#6366f1",
                                            ][index % 8]}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "white",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: "8px",
                                        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                                    }}
                                    formatter={(value: any) =>
                                        (typeof value === 'number' ? value : 0).toLocaleString("uk-UA", {
                                            style: "currency",
                                            currency: "UAH",
                                        })
                                    }
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* OPEX Structure Bar Chart */}
            {data.opex.categories.length > 0 && (
                <div className={styles.chartCard}>
                    <div className={styles.chartHeader}>
                        <h3 className={styles.chartTitle}>Структура операційних витрат (OPEX)</h3>
                    </div>
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data.opex.categories}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="name"
                                    stroke="#6b7280"
                                    fontSize={12}
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                />
                                <YAxis
                                    stroke="#6b7280"
                                    fontSize={12}
                                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "white",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: "8px",
                                        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                                    }}
                                    formatter={(value: any) =>
                                        (typeof value === 'number' ? value : 0).toLocaleString("uk-UA", {
                                            style: "currency",
                                            currency: "UAH",
                                        })
                                    }
                                />
                                <Bar dataKey="amount" name="Витрати" fill="#ef4444" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Budget Modal */}
            <BudgetModal
                isOpen={budgetModalOpen}
                onClose={() => setBudgetModalOpen(false)}
                onSave={handleSaveBudget}
                existingItems={budget?.items || []}
                month={filters.startDate ? filters.startDate.substring(0, 7) : new Date().toISOString().substring(0, 7)}
                categories={expenseCategories}
            />
        </div>
    );
}
