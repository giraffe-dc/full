
import React from 'react';
import { XReport, ServiceCategory } from '../../types/cash-register';
import { CashDenominations } from './CashDenominations';
import styles from './XReportView.module.css';

interface PrevDenomInfo {
  shiftNumber: number;
  countedTotal: number;
  endBalance: number;
  diff: number;
}

interface XReportViewProps {
  report: XReport;
  shiftId: string;
  prevDenomInfo?: PrevDenomInfo | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  bowling: '🎳 Боулінг',
  billiards: '🎱 Більярд',
  karaoke: '🎤 Караоке',
  games: '🕹️ Ігри',
  bar: '🍹 Бар',
  other: '📦 Інше'
};

export function XReportView({ report, shiftId, prevDenomInfo }: XReportViewProps) {
  // Ensure we have numbers

  const totalSales = report.totalSales || 0;

  return (
    <div className={styles.container}>
      {/* Header Cards */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard} style={{ background: '#eff6ff', borderColor: '#dbeafe' }}>
          <h3>🏁 Початковий залишок</h3>
          <div className={styles.amount}>{report.startBalance.toFixed(2)} ₴</div>
          <div className={styles.subText}>Залишок на початок зміни</div>
        </div>
        <div className={styles.summaryCard} style={{ background: '#f0fdf4', borderColor: '#dcfce7' }}>
          <h3>💵 Готівка в касі</h3>
          <div className={styles.amount}>{report.currentBalance.toFixed(2)} ₴</div>
          <div className={styles.subText}>Початковий залишок + Приход - Витрати</div>
        </div>
        <div className={styles.summaryCard} style={{ background: '#f8fafc', borderColor: '#f1f5f9' }}>
          <h3>🛒 Продажі (Всього)</h3>
          <div className={styles.amount}>{totalSales.toFixed(2)} ₴</div>
          <div className={styles.subText}>Чеків: {report.receiptsCount}</div>
        </div>
      </div>

      {/* Cash Flow Details */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>💵 Рух готівкових коштів</h4>
        <div className={styles.detailsGrid}>
          <div className={styles.detailItem}>
            <span>🛍️ Продажі (Готівка):</span>
            <span style={{ color: '#16a34a', fontWeight: '800' }}>+ {report.totalSalesCash?.toFixed(2) || '0.00'} ₴</span>
          </div>
          <div className={styles.detailItem}>
            <span>💳 Продажі (Карта):</span>
            <span style={{ color: '#2563eb', fontWeight: '800' }}>{report.totalSalesCard?.toFixed(2) || '0.00'} ₴</span>
          </div>
          <div className={styles.detailItem}>
            <span>📥 Ручні доходи:</span>
            <span style={{ color: '#16a34a', fontWeight: '800' }}>+ {report.totalIncome?.toFixed(2) || '0.00'} ₴</span>
          </div>
          <div className={styles.detailItem}>
            <span>📤 Витрати:</span>
            <span style={{ color: '#dc2626', fontWeight: '800' }}>- {report.totalExpenses?.toFixed(2) || '0.00'} ₴</span>
          </div>
          <div className={styles.detailItem}>
            <span>🏦 Інкасація:</span>
            <span style={{ color: '#9333ea', fontWeight: '#800' }}>- {report.totalIncasation?.toFixed(2) || '0.00'} ₴</span>
          </div>
        </div>
      </div>

      {/* Sales by Category - REFINED UI */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>🏷️ Продажі по категоріям</h4>
        <div className={styles.categoryStatsList}>
          {Object.entries(report.salesByCategory)
            .sort((a, b) => b[1] - a[1]) // Sort by amount descending
            .map(([category, amount]) => {
              const label = CATEGORY_LABELS[category] || category;
              const percentage = totalSales > 0 ? (amount / totalSales) * 100 : 0;

              return (
                <div key={category} className={styles.categoryStatItem}>
                  <div className={styles.categoryStatHeader}>
                    <span className={styles.categoryStatName}>{label}</span>
                    <span className={styles.categoryStatValue}>
                      {amount.toFixed(2)} ₴
                      <small className={styles.categoryPercentage}> ({percentage.toFixed(1)}%)</small>
                    </span>
                  </div>
                  <div className={styles.progressBarBg}>
                    <div
                      className={styles.progressBarFill}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          {Object.keys(report.salesByCategory).length === 0 && (
            <p style={{ color: '#94a3b8', fontStyle: 'italic', padding: '10px 0' }}>Продажів ще не було</p>
          )}
        </div>
      </div>

      {/* Detailed Transactions List */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>📝 Детальний список операцій</h4>
        <div className={styles.transactionsTableContainer}>
          <table className={styles.transactionsTable}>
            <thead>
              <tr>
                <th>Час</th>
                <th>Тип / Категорія</th>
                <th style={{ textAlign: 'right' }}>Сума</th>
                <th>Коментар</th>
                <th>Касир</th>
              </tr>
            </thead>
            <tbody>
              {report.transactions && report.transactions.length > 0 ? (
                report.transactions.map((tx: any) => (
                  <tr key={tx.id || tx._id}>
                    <td className={styles.txTime}>
                      {new Date(tx.createdAt || tx.date).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className={styles.txType}>
                      <div className={styles.typeLabel}>
                        <span>{tx.category === 'deposit' ? 'Передплата' : tx.category === 'deposit_refund' ? 'Повернення передплати' : tx.category || tx.type}</span>
                        {tx.source && (
                          <span className={styles.sourceLabel}>• {tx.source === 'accounting' ? 'Бухгалтерія' : tx.source === 'stock' ? 'Склад' : 'Каса'}</span>
                        )}
                      </div>
                    </td>
                    <td className={styles.txAmount} style={{ color: tx.amount < 0 ? '#dc2626' : '#16a34a' }}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)} ₴
                    </td>
                    <td className={styles.txComment} title={tx.comment || tx.description}>
                      {tx.comment || tx.description || '—'}
                    </td>
                    <td className={styles.txAuthor}>{tx.authorName || tx.user || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px', fontStyle: 'italic' }}>
                    За цю зміну ще не було ручних операцій
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cash Denomination Counter */}
      <div className={styles.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px' }}>
          <h4 className={styles.sectionTitle} style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>🪙 Підрахунок готівки по купюрно</h4>
          {prevDenomInfo && (
            <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Мин. зміна (#{prevDenomInfo.shiftNumber}):</span>
              <span style={{
                fontWeight: 600,
                color: Math.abs(prevDenomInfo.diff) < 0.005 ? '#15803d' : '#c2410c',
                background: Math.abs(prevDenomInfo.diff) < 0.005 ? '#dcfce7' : '#ffedd5',
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                {Math.abs(prevDenomInfo.diff) < 0.005
                  ? 'Все ок'
                  : `${prevDenomInfo.diff > 0 ? '+' : ''}${prevDenomInfo.diff.toFixed(2)} ₴`}
              </span>
            </div>
          )}
        </div>

        <CashDenominations
          shiftId={shiftId}
          expectedBalance={report.currentBalance}
          initialCounts={report.denominationCounts}
        />
      </div>

      <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
        <button className={styles.buttonPrint} onClick={() => window.print()}>
          <span>🖨️ Друк X-звіту</span>
        </button>
      </div>

      <div style={{ marginTop: '16px', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
        <div>Зміну відкрито: {report.shiftStartTime ? new Date(report.shiftStartTime).toLocaleString('uk-UA') : 'Unknown'}</div>
        <div>Звіт сформовано: {new Date(report.createdAt).toLocaleString('uk-UA')}</div>
      </div>
    </div>
  );
}
