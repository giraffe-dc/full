import React from 'react';
import { PeriodAnalytics, ServiceCategory } from '../../types/cash-register';
import styles from './ReportViews.module.css';

interface PeriodAnalyticsViewProps {
  analytics: PeriodAnalytics;
}

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  bowling: '🎳 Боулінг',
  billiards: '🎱 Більярд',
  karaoke: '🎤 Караоке',
  games: '🕹️ Ігри',
  bar: '🍹 Бар',
};

export function PeriodAnalyticsView({ analytics }: PeriodAnalyticsViewProps) {
  return (
    <div className={styles.analyticsContainer}>
      <div className={styles.reportCard}>
        <div className={styles.reportHeader}>
          <h2>Аналітика за період</h2>
          <div className={styles.reportMeta}>
            <span>{analytics.startDate}</span>
            <span>—</span>
            <span>{analytics.endDate}</span>
          </div>
        </div>

        <div className={styles.reportStats}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Загальний дохід</div>
            <div className={styles.statValue}>{analytics.totalRevenue.toFixed(2)} ₴</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Середній чек</div>
            <div className={styles.statValue}>{analytics.averageCheck.toFixed(2)} ₴</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Клієнтів</div>
            <div className={styles.statValue}>{analytics.customersCount}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Чеків</div>
            <div className={styles.statValue}>{analytics.receiptsCount}</div>
          </div>
        </div>

        <div className={styles.categoryBreakdown}>
          <h3>Розбивка по категоріях</h3>
          {Object.entries(analytics.salesByCategory).map(([category, data]) => (
            <div key={category} className={styles.categoryRow}>
              <div className={styles.categoryName}>
                {CATEGORY_LABELS[category as ServiceCategory]}
              </div>
              <div className={styles.categoryBar}>
                <div
                  className={styles.categoryBarFill}
                  style={{ width: `${data.percentage}%` }}
                />
              </div>
              <div className={styles.categoryAmount}>
                {data.total.toFixed(2)} ₴ ({data.percentage.toFixed(1)}%)
              </div>
            </div>
          ))}
        </div>

        {analytics.topServices.length > 0 && (
          <div className={styles.topServices}>
            <h3>ТОП-5 найпопулярніших послуг</h3>
            {analytics.topServices.map((service, index) => (
              <div key={service.serviceId} className={styles.serviceRow}>
                <span className={styles.serviceRank}>{index + 1}.</span>
                <span className={styles.serviceName}>{service.serviceName}</span>
                <span className={styles.serviceQuantity}>{service.quantity} шт</span>
                <span className={styles.serviceTotal}>{service.total.toFixed(2)} ₴</span>
                <span className={styles.servicePercent}>({service.percentage.toFixed(1)}%)</span>
              </div>
            ))}
          </div>
        )}

        {analytics.dailyStats.length > 0 && (
          <div className={styles.dailyStats}>
            <h3>Щоденна статистика</h3>
            <div className={styles.dailyStatsTable}>
              <div className={styles.dailyStatsHeader}>
                <div>Дата</div>
                <div>Дохід</div>
                <div>Чеків</div>
              </div>
              {analytics.dailyStats.map((day) => (
                <div key={day.date} className={styles.dailyStatsRow}>
                  <div>{new Date(day.date).toLocaleDateString('uk-UA')}</div>
                  <div>{day.revenue.toFixed(2)} ₴</div>
                  <div>{day.receiptsCount}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={styles.reportFooter}>
          <button className={styles.buttonPrint}>🖨️ Друк звіту</button>
          <button className={styles.buttonExport}>📊 Експорт CSV</button>
        </div>
      </div>
    </div>
  );
}
