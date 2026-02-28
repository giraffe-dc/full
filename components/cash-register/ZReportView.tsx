import React from 'react';
import { ZReport, ServiceCategory } from '../../types/cash-register';
import { CashDenominations } from './CashDenominations';
import styles from './ReportViews.module.css';

interface ZReportViewProps {
  report: ZReport;
}

export function ZReportView({ report }: ZReportViewProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('uk-UA');
  };

  const formatDuration = (start: string, end: string) => {
    if (!start || !end) return 'Невідомо';

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 'Невідомо';

    const diff = endDate.getTime() - startDate.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}г ${mins}хв`;
  };

  const totalSales = report.salesByCategory
    ? Object.values(report.salesByCategory).reduce((sum, val) => sum + val, 0)
    : 0;

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
          <div className={styles.statValue}>{formatDuration(report.createdAt, report.endTime || report.createdAt)}</div>
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
          <span>{(report.startBalance ?? 0).toFixed(2)} ₴</span>
        </div>
        <div className={styles.balanceRow}>
          <span>Продажи (всього):</span>
          <span>{(report.totalSales ?? 0).toFixed(2)} ₴</span>
        </div>
        <div className={styles.balanceRow} style={{ paddingLeft: '20px', fontSize: '0.9em', color: '#666' }}>
          <span>Готівка:</span>
          <span>{(report.totalSalesCash ?? 0).toFixed(2)} ₴</span>
        </div>
        <div className={styles.balanceRow} style={{ paddingLeft: '20px', fontSize: '0.9em', color: '#666', borderBottom: '1px solid #f0f0f0', marginBottom: '5px' }}>
          <span>Картка:</span>
          <span>{(report.totalSalesCard ?? 0).toFixed(2)} ₴</span>
        </div>
        <div className={styles.balanceRow}>
          <span>Витрати:</span>
          <span>-{(report.totalExpenses ?? 0).toFixed(2)} ₴</span>
        </div>
        <div className={`${styles.balanceRow} ${styles.balanceRowTotal}`}>
          <span>Кінцевий баланс:</span>
          <span>{(report.endBalance ?? 0).toFixed(2)} ₴</span>
        </div>
        {report.cashDifference !== 0 && (
          <div className={`${styles.balanceRow} ${styles.balanceRowDifference}`}>
            <span>Різниця:</span>
            <span className={(report.cashDifference ?? 0) > 0 ? styles.positive : styles.negative}>
              {(report.cashDifference ?? 0) > 0 ? '+' : ''}{(report.cashDifference ?? 0).toFixed(2)} ₴
            </span>
          </div>
        )}
      </div>

      <div style={{ padding: '0 20px 20px' }}>
        <CashDenominations
          shiftId={report.shiftId}
          expectedBalance={report.endBalance}
          initialCounts={report.denominationCounts}
          readOnly={true}
        />
      </div>

      <div className={styles.categoryBreakdown}>
        <h3>Розбивка по категоріях</h3>
        {report.salesByCategory && Object.entries(report.salesByCategory).map(([category, amount]) => {
          const percentage = totalSales > 0 ? (amount / totalSales) * 100 : 0;
          const label = category;
          return (
            <div key={category} className={styles.categoryRow}>
              <div className={styles.categoryName}>
                {label}
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

      {report.topServices && report.topServices.length > 0 && (
        <div className={styles.topServices}>
          <h3>Топ послуг</h3>
          {report.topServices.slice(0, 5).map((service, idx) => (
            <div key={service.serviceId} className={styles.serviceRow}>
              <span className={styles.serviceRank}>#{idx + 1}</span>
              <span className={styles.serviceName}>{service.serviceName}</span>
              <span className={styles.serviceQuantity}>x{service.quantity}</span>
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
