
import React from "react";
import styles from "./DashboardSection.module.css";

export interface DailyPoint {
  dateKey: string;
  income: number;
  expense: number;
  balance: number;
}

interface DashboardSectionProps {
  totals: { income: number; expense: number; balance: number };
  totalIncomeAmount: number;
  averageCheck: number;
  totalVisits: number;
  incomeTxCount: number;
  operationCount: number;
  incomeCategoryStats: { key: string; label: string; total: number; percent: number }[];
  expenseCategoryStats: { key: string; label: string; total: number; percent: number }[];
  paymentMethodStats: { key: string; label: string; total: number; percent: number }[];
  dailyStats: DailyPoint[];
  maxDailyValue: number;
  filters: { startDate: string; endDate: string };
  onFilterChange: (key: string, value: string) => void;
  onResetFilters: () => void;
}

export function DashboardSection({
  totals,
  totalIncomeAmount,
  averageCheck,
  totalVisits,
  incomeTxCount,
  operationCount,
  incomeCategoryStats,
  expenseCategoryStats,
  paymentMethodStats,
  dailyStats,
  maxDailyValue,
  filters,
  onFilterChange,
  onResetFilters
}: DashboardSectionProps) {
  return (
    <div className={styles.dashboardContainer}>

      {/* FILTER BAR */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Період з</label>
          <input
            type="date"
            className={styles.filterInput}
            value={filters.startDate}
            onChange={(e) => onFilterChange("startDate", e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>по</label>
          <input
            type="date"
            className={styles.filterInput}
            value={filters.endDate}
            onChange={(e) => onFilterChange("endDate", e.target.value)}
          />
        </div>
        {(filters.startDate || filters.endDate) && (
          <button className={styles.resetButton} onClick={onResetFilters}>
            Скинути фільтри
          </button>
        )}
      </div>

      {/* HERO CARDS */}
      <section className={styles.heroGrid}>
        <div className={styles.heroCard}>
          <span className={styles.heroLabel}>Всього Доходів</span>
          <span className={`${styles.heroValue} ${styles.incomeText}`}>
            {totals.income.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴
          </span>
          <span className={styles.heroSub}>{incomeTxCount} записів</span>
        </div>

        <div className={styles.heroCard}>
          <span className={styles.heroLabel}>Всього Витрат</span>
          <span className={`${styles.heroValue} ${styles.expenseText}`}>
            {totals.expense.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴
          </span>
          <span className={styles.heroSub}>{operationCount - incomeTxCount} записів</span>
        </div>

        <div className={styles.heroCard}>
          <span className={styles.heroLabel}>Чистий Баланс</span>
          <span className={`${styles.heroValue} ${totals.balance >= 0 ? styles.balancePos : styles.balanceNeg}`}>
            {totals.balance.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴
          </span>
          <span className={styles.heroSub}>Різниця доходів і витрат</span>
        </div>

        <div className={styles.heroCard}>
          <span className={styles.heroLabel}>Середній Чек</span>
          <span className={styles.heroValue}>{averageCheck.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴</span>
          <span className={styles.heroSub}>Транзакцій відвідувачів: {totalVisits}</span>
        </div>
      </section>

      {/* TIMELINE */}
      <section className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <h2 className={styles.chartTitle}>Динаміка Фінансів</h2>
        </div>
        {dailyStats.length === 0 ? (
          <div className={styles.emptyState}>Немає даних за обраний період</div>
        ) : (
          <div className={styles.timelineScroll}>
            <ul className={styles.timelineList}>
              {dailyStats.map((d) => {
                const incH = maxDailyValue ? (d.income / maxDailyValue) * 100 : 0;
                const expH = maxDailyValue ? (d.expense / maxDailyValue) * 100 : 0;
                return (
                  <li key={d.dateKey} className={styles.timelineItem}>
                    <div className={styles.timelineGraph}>
                      <div className={`${styles.graphBar} ${styles.inc}`} style={{ height: `${Math.max(4, incH)}%` }} title={`Дохід: ${d.income}`} />
                      <div className={`${styles.graphBar} ${styles.exp}`} style={{ height: `${Math.max(4, expH)}%` }} title={`Витрата: ${d.expense}`} />
                    </div>
                    <div className={styles.timelineDate}>
                      {new Date(d.dateKey).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" })}
                    </div>
                    <div className={styles.timelineValues}>
                      <span className={styles.valInc}>+{d.income > 1000 ? (d.income / 1000).toFixed(1) + 'k' : d.income.toFixed(0)}</span>
                      <span className={styles.valExp}>-{d.expense > 1000 ? (d.expense / 1000).toFixed(1) + 'k' : d.expense.toFixed(0)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {/* CATEGORIES GRID */}
      <div className={styles.chartsGrid}>

        {/* INCOME CATEGORIES */}
        <section className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Структура Доходів</h2>

          {/* Payment Methods Breakdown */}
          {paymentMethodStats && paymentMethodStats.length > 0 && (
            <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '0.9rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>За типом оплати</h3>
              {paymentMethodStats.map(stat => (
                <div key={stat.key} className={styles.listRow}>
                  <div className={styles.listInfo}>
                    <div className={styles.listLabel}>
                      <span>{stat.label}</span>
                      <span>{stat.total.toLocaleString('uk-UA')} ₴</span>
                    </div>
                    <div className={styles.barBg}>
                      <div
                        className={styles.barFill}
                        style={{
                          width: `${stat.percent}%`,
                          backgroundColor: stat.key === 'cash' ? '#22c55e' : stat.key === 'card' ? '#3b82f6' : '#a855f7'
                        }}
                      ></div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px' }}>{stat.percent.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Categories Breakdown */}
          <h3 style={{ fontSize: '0.9rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>За категоріями</h3>
          {incomeCategoryStats.length === 0 ? (
            <div className={styles.emptyState}>Немає даних</div>
          ) : (
            <div>
              {incomeCategoryStats.map(cat => (
                <div key={cat.key} className={styles.listRow}>
                  <div className={styles.listInfo}>
                    <div className={styles.listLabel}>
                      <span>{cat.label}</span>
                      <span>{cat.total.toLocaleString('uk-UA')} ₴</span>
                    </div>
                    <div className={styles.barBg}>
                      <div className={`${styles.barFill} ${styles.income}`} style={{ width: `${cat.percent}%` }}></div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px' }}>{cat.percent.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* EXPENSE CATEGORIES */}
        <section className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Структура Витрат</h2>
          {expenseCategoryStats.length === 0 ? (
            <div className={styles.emptyState}>Немає даних</div>
          ) : (
            <div>
              {expenseCategoryStats.map(cat => (
                <div key={cat.key} className={styles.listRow}>
                  <div className={styles.listInfo}>
                    <div className={styles.listLabel}>
                      <span>{cat.label}</span>
                      <span>{cat.total.toLocaleString('uk-UA')} ₴</span>
                    </div>
                    <div className={styles.barBg}>
                      <div className={`${styles.barFill} ${styles.expense}`} style={{ width: `${cat.percent}%` }}></div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px' }}>{cat.percent.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

