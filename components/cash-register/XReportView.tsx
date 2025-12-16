
import React from 'react';
import { XReport, ServiceCategory } from '../../types/cash-register';
import styles from './XReportView.module.css';

interface XReportViewProps {
  report: XReport;
}

const CATEGORY_LABELS: Record<string, string> = {
  bowling: '🎳 Боулінг',
  billiards: '🎱 Більярд',
  karaoke: '🎤 Караоке',
  games: '🕹️ Ігри',
  bar: '🍹 Бар',
  other: '📦 Інше'
};

export function XReportView({ report }: XReportViewProps) {
  // Ensure we have numbers
  const totalReceived = (report.totalSalesCash || 0) + (report.totalIncome || 0);
  const totalSpent = (report.totalExpenses || 0) + (report.totalIncasation || 0);

  return (
    <div className={styles.container}>
      {/* Header Cards */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard} style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
          <h3>💵 Готівка в касі</h3>
          <div className={styles.amount}>{report.currentBalance.toFixed(2)} ₴</div>
          <div className={styles.subText}>Початковий залишок + Приход - Витрати</div>
        </div>
        <div className={styles.summaryCard} style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
          <h3>🛒 Продажі (Всього)</h3>
          <div className={styles.amount}>{report.totalSales.toFixed(2)} ₴</div>
          <div className={styles.subText}>Чеків: {report.receiptsCount}</div>
        </div>
      </div>

      {/* Cash Flow Details */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Рух готівкових коштів</h4>
        <div className={styles.detailsGrid}>
          <div className={styles.detailItem}>
             <span>💵 Продажі (Готівка):</span>
             <span style={{ color: '#16a34a', fontWeight: 'bold' }}>+ {report.totalSalesCash?.toFixed(2) || '0.00'} ₴</span>
          </div>
          <div className={styles.detailItem}>
             <span>💳 Продажі (Карта):</span>
             <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{report.totalSalesCard?.toFixed(2) || '0.00'} ₴</span>
             {/* Card sales don't affect cash drawer directly but are part of sales */}
          </div>
          <div className={styles.detailItem}>
             <span>➕ Внесення коштів:</span>
             <span style={{ color: '#16a34a', fontWeight: 'bold' }}>+ {report.totalIncome?.toFixed(2) || '0.00'} ₴</span>
          </div>
          <div className={styles.detailItem}>
             <span>➖ Витрати:</span>
             <span style={{ color: '#dc2626', fontWeight: 'bold' }}>- {report.totalExpenses?.toFixed(2) || '0.00'} ₴</span>
          </div>
          <div className={styles.detailItem}>
             <span>🏦 Інкасація:</span>
             <span style={{ color: '#9333ea', fontWeight: 'bold' }}>- {report.totalIncasation?.toFixed(2) || '0.00'} ₴</span>
          </div>
        </div>
      </div>

      {/* Sales by Category */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Продажі по категоріям</h4>
        <div className={styles.categoryList}>
          {Object.entries(report.salesByCategory).map(([category, amount]) => {
              const label = CATEGORY_LABELS[category] || category;
              return (
                <div key={category} className={styles.categoryitem}>
                  <span className={styles.categoryName}>{label}</span>
                  <span className={styles.categoryAmount}>{amount.toFixed(2)} ₴</span>
                </div>
              );
          })}
          {Object.keys(report.salesByCategory).length === 0 && (
             <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>Продажів ще не було</p>
          )}
        </div>
      </div>
      
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
         <button className={styles.buttonPrint} onClick={() => window.print()}>🖨️ Друк X-звіту</button>
      </div>

      <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center' }}>
        X-Звіт сформовано: {new Date(report.createdAt).toLocaleString('uk-UA')}
      </div>
    </div>
  );
}
