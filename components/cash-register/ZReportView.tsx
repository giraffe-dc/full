import React from 'react';
import { ZReport, ServiceCategory } from '../../types/cash-register';
import styles from './ReportViews.module.css';

interface ZReportViewProps {
  report: ZReport;
}

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  bowling: '🎳 Боулінг',
  billiards: '🎱 Більярд',
  karaoke: '🎤 Караоке',
  games: '🕹️ Ігри',
  bar: '🍹 Бар',
};

export function ZReportView({ report }: ZReportViewProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('uk-UA');
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}г ${mins}хв`;
  };

  const totalSales = Object.values(report.salesByCategory).reduce((sum, val) => sum + val, 0);

  return (
    <div className={styles.reportCard}>
      <div className={styles.reportHeader}>
        <h2>Z-Звіт (закриття зміни)</h2>
        <div className={styles.reportMeta}>
          <span>Зміна #{report.shiftNumber}</span>
          <span>{formatDate(report.endTime)}</span>
        </div>
      </div>

      <div className={styles.reportStats}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Тривалість зміни</div>
          <div className={styles.statValue}>{formatDuration(report.duration)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Чеків</div>
          <div className={styles.statValue}>{report.receiptsCount}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Продажи</div>
          <div className={styles.statValue}>{report.totalSales.toFixed(2)} ₴</div>
        </div>
      </div>

      <div className={styles.balanceSection}>
        <h3>Касова дисципліна</h3>
        <div className={styles.balanceRow}>
          <span>Початковий баланс:</span>
          <span>{report.startBalance.toFixed(2)} ₴</span>
        </div>
        <div className={styles.balanceRow}>
          <span>Продажи:</span>
          <span>{report.totalSales.toFixed(2)} ₴</span>
        </div>
        <div className={styles.balanceRow}>
          <span>Витрати:</span>
          <span>-{report.totalExpenses.toFixed(2)} ₴</span>
        </div>
        <div className={`${styles.balanceRow} ${styles.balanceRowTotal}`}>
          <span>Кінцевий баланс:</span>
          <span>{report.endBalance.toFixed(2)} ₴</span>
        </div>
        {report.cashDifference !== 0 && (
          <div className={`${styles.balanceRow} ${styles.balanceRowDifference}`}>
            <span>Різниця:</span>
            <span className={report.cashDifference > 0 ? styles.positive : styles.negative}>
              {report.cashDifference > 0 ? '+' : ''}{report.cashDifference.toFixed(2)} ₴
            </span>
          </div>
        )}
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

      {report.topServices.length > 0 && (
        <div className={styles.topServices}>
          <h3>ТОП-5 послуг</h3>
          {report.topServices.map((service, index) => (
            <div key={service.serviceId} className={styles.serviceRow}>
              <span className={styles.serviceRank}>{index + 1}.</span>
              <span className={styles.serviceName}>{service.serviceName}</span>
              <span className={styles.serviceQuantity}>{service.quantity} шт</span>
              <span className={styles.serviceTotal}>{service.total.toFixed(2)} ₴</span>
            </div>
          ))}
        </div>
      )}

      <div className={styles.reportFooter}>
        <button className={styles.buttonPrint}>🖨️ Друк Z-звіту</button>
      </div>
    </div>
  );
}
