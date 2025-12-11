import React from 'react';
import { XReport, ServiceCategory } from '../../types/cash-register';
import styles from './ReportViews.module.css';

interface XReportViewProps {
  report: XReport;
}

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  bowling: '🎳 Боулінг',
  billiards: '🎱 Більярд',
  karaoke: '🎤 Караоке',
  games: '🕹️ Ігри',
  bar: '🍹 Бар',
};

export function XReportView({ report }: XReportViewProps) {
  const totalSales = Object.values(report.salesByCategory).reduce((sum, val) => sum + val, 0);

  return (
    <div className={styles.reportCard}>
      <div className={styles.reportHeader}>
        <h2>X-Звіт (поточна зміна)</h2>
        <div className={styles.reportMeta}>
          <span>Зміна #{report.shiftNumber}</span>
          <span>{new Date(report.createdAt).toLocaleString('uk-UA')}</span>
        </div>
      </div>

      <div className={styles.reportStats}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Чеків створено</div>
          <div className={styles.statValue}>{report.receiptsCount}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Загальна сума</div>
          <div className={styles.statValue}>{report.totalSales.toFixed(2)} ₴</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Поточний баланс</div>
          <div className={styles.statValue}>{report.currentBalance.toFixed(2)} ₴</div>
        </div>
      </div>

      <div className={styles.categoryBreakdown}>
        <h3>Розбивка по категоріях</h3>
        {Object.entries(report.salesByCategory).map(([category, amount]) => {
          const percentage = totalSales > 0 ? (amount / totalSales) * 100 : 0;
          return (
            <div key={category} className={styles.categoryRow}>
              <div className={styles.categoryName}>
                {CATEGORY_LABELS[category as ServiceCategory]}
              </div>
              <div className={styles.categoryBar}>
                <div
                  className={styles.categoryBarFill}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className={styles.categoryAmount}>
                {amount.toFixed(2)} ₴ ({percentage.toFixed(1)}%)
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.reportFooter}>
        <button className={styles.buttonPrint}>🖨️ Друк X-звіту</button>
      </div>
    </div>
  );
}
