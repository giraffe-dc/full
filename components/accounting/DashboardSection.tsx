"use client";

import React from "react";
import styles from "../../app/accounting/page.module.css";

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
  incomeCategoryStats: { key: string; label: string; total: number; percent: number }[];
  expenseCategoryStats: { key: string; label: string; total: number; percent: number }[];
  dailyStats: DailyPoint[];
  maxDailyValue: number;
}

export function DashboardSection({
  totals,
  totalIncomeAmount,
  averageCheck,
  totalVisits,
  incomeTxCount,
  incomeCategoryStats,
  expenseCategoryStats,
  dailyStats,
  maxDailyValue,
}: DashboardSectionProps) {
  return (
    <>
      <section className={styles.dashboardHero}>
        <div className={styles.dashboardHeroDate}>
          <div className={styles.dashboardHeroDateLabel}>Сьогодні</div>
          <div className={styles.dashboardHeroDateValue}>
            {new Date().toLocaleDateString("uk-UA", {
              day: "2-digit",
              month: "long",
            })}
          </div>
        </div>
        <div className={styles.dashboardHeroItem}>
          <div className={styles.dashboardHeroLabel}>Виручка</div>
          <div className={styles.dashboardHeroValue}>{totalIncomeAmount.toFixed(2)} ₴</div>
        </div>
        <div className={styles.dashboardHeroItem}>
          <div className={styles.dashboardHeroLabel}>Прибуток</div>
          <div className={styles.dashboardHeroValue}>{totals.balance.toFixed(2)} ₴</div>
        </div>
        <div className={styles.dashboardHeroItem}>
          <div className={styles.dashboardHeroLabel}>Чеки</div>
          <div className={styles.dashboardHeroValue}>{incomeTxCount}</div>
        </div>
        <div className={styles.dashboardHeroItem}>
          <div className={styles.dashboardHeroLabel}>Відвідувачі</div>
          <div className={styles.dashboardHeroValue}>{totalVisits}</div>
        </div>
        <div className={styles.dashboardHeroItem}>
          <div className={styles.dashboardHeroLabel}>Середній чек</div>
          <div className={styles.dashboardHeroValue}>{averageCheck.toFixed(2)} ₴</div>
        </div>
      </section>

      <section className={styles.timelineCard}>
        <div className={styles.revenueHeader}>
          <h2>Виручка</h2>
          <div className={styles.revenueTabs}>
            <button type="button" className={`${styles.revenueTab} ${styles.revenueTabActive}`}>
              День
            </button>
            <button type="button" className={styles.revenueTab}>
              Тиждень
            </button>
            <button type="button" className={styles.revenueTab}>
              Місяць
            </button>
          </div>
        </div>
        {dailyStats.length === 0 || maxDailyValue === 0 ? (
          <p className={styles.empty}>Немає даних для побудови динаміки</p>
        ) : (
          <ul className={styles.timelineList}>
            {dailyStats.map((d) => {
              const incomePercent = (d.income / maxDailyValue) * 100;
              const expensePercent = (d.expense / maxDailyValue) * 100;
              return (
                <li key={d.dateKey} className={styles.timelineRow}>
                  <div className={styles.timelineDate}>
                    {new Date(d.dateKey).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" })}
                  </div>
                  <div className={styles.timelineBars}>
                    <div className={styles.timelineBarTrack}>
                      <div
                        className={styles.timelineBarIncome}
                        style={{ width: `${Math.max(3, incomePercent)}%` }}
                      />
                    </div>
                    <div className={styles.timelineBarTrack}>
                      <div
                        className={styles.timelineBarExpense}
                        style={{ width: `${Math.max(3, expensePercent)}%` }}
                      />
                    </div>
                  </div>
                  <div className={styles.timelineNumbers}>
                    <span className={styles.timelineIncome}>+{d.income.toFixed(0)} ₴</span>
                    <span className={styles.timelineExpense}>-{d.expense.toFixed(0)} ₴</span>
                    <span
                      className={
                        d.balance >= 0 ? styles.timelineBalancePositive : styles.timelineBalanceNegative
                      }
                    >
                      {d.balance >= 0 ? "+" : ""}
                      {d.balance.toFixed(0)} ₴
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className={styles.dashboardGrid}>
        <section className={styles.dashboardCard}>
          <h2>Структура доходів</h2>
          {incomeCategoryStats.length === 0 ? (
            <p className={styles.empty}>Немає доходів за обраний період</p>
          ) : (
            <ul className={styles.dashboardList}>
              {incomeCategoryStats.map((item) => (
                <li key={item.key} className={styles.dashboardListItem}>
                  <div className={styles.dashboardListHeader}>
                    <span className={styles.dashboardListLabel}>{item.label}</span>
                    <span className={styles.dashboardListValue}>{item.total.toFixed(2)} ₴</span>
                  </div>
                  <div className={styles.dashboardBarTrack}>
                    <div
                      className={styles.dashboardBarIncome}
                      style={{ width: `${Math.max(5, Math.min(100, item.percent))}%` }}
                    />
                  </div>
                  <div className={styles.dashboardListMeta}>{item.percent.toFixed(1)}% від усіх доходів</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.dashboardCard}>
          <h2>Основні витрати</h2>
          {expenseCategoryStats.length === 0 ? (
            <p className={styles.empty}>Немає витрат за обраний період</p>
          ) : (
            <ul className={styles.dashboardList}>
              {expenseCategoryStats.map((item) => (
                <li key={item.key} className={styles.dashboardListItem}>
                  <div className={styles.dashboardListHeader}>
                    <span className={styles.dashboardListLabel}>{item.label}</span>
                    <span className={styles.dashboardListValue}>{item.total.toFixed(2)} ₴</span>
                  </div>
                  <div className={styles.dashboardBarTrack}>
                    <div
                      className={styles.dashboardBarExpense}
                      style={{ width: `${Math.max(5, Math.min(100, item.percent))}%` }}
                    />
                  </div>
                  <div className={styles.dashboardListMeta}>{item.percent.toFixed(1)}% від усіх витрат</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
