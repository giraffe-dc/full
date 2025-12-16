
import React, { useState } from 'react';
import styles from './ClientsSection.module.css';

export interface ShiftTransaction {
  id: string;
  category: string;
  time: string;
  sum: number;
  employee: string;
  comment?: string;
  editedBy?: string;
}

export interface CashShift {
  id: string;
  shiftNumber: string;
  startTime: string;
  endTime: string | null;
  startBalance: number;
  incasation: number;
  // totalSalesCash
  // : number; // In register
  cashDifference: number;

  // Detailed stats
  bookBalance: number;
  actualBalance: number;
  totalSalesCash: number;
  totalSalesCard
  : number;
  income: number;
  totalExpenses: number;


  receipts: ShiftTransaction[];
  status: 'opened' | 'closed';
  cashier: string;
}

interface CashShiftsSectionProps {
  rows: CashShift[];
  onAddShift: () => void;
  onCloseShift: (id: string) => void;
  onOpenShift: (id: string) => void;
  onViewShift: (id: string) => void;
}

export function CashShiftsSection({ rows, onAddShift, onCloseShift, onOpenShift, onViewShift }: CashShiftsSectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("uk-UA", { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  };

  const formatMoney = (amount: number) => {
    if (!amount) return "—";
    return new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + ' ₴';
  };

  // Helper for status styles
  const getDiffStyle = (diff: number) => diff !== 0 ? { color: 'red' } : { color: 'green' };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h2 className={styles.title}>Касові зміни</h2>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.toolbarButton}>
            ⬇ Експорт
          </button>
          {/* Add Shift button can be here or elsewhere */}
        </div>
      </div>

      {/* Toolbar/Filter placeholder */}
      <div className={styles.controls}>
        {/* <button className={styles.primaryButton} onClick={onAddShift}>+ Відкрити зміну</button> */}
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Зміна відкрита</th>
                <th>Зміна закрита</th>
                <th className={styles.moneyCell}>Початок зміни</th>
                <th className={styles.moneyCell}>Інкасація</th>
                <th className={styles.moneyCell}>В касі</th>
                <th className={styles.moneyCell}>Різниця</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '20px' }}>Немає змін</td></tr>
              )}
              {rows.map((shift) => (
                <React.Fragment key={shift.id}>
                  <tr
                    onClick={() => toggleExpand(shift.id)}
                    style={{ cursor: 'pointer', background: expandedId === shift.id ? '#f9fafb' : 'white', borderBottom: expandedId === shift.id ? 'none' : '1px solid #eee' }}
                  >
                    <td>{shift.shiftNumber}</td>
                    <td>{formatDate(shift.startTime)}</td>
                    <td>{shift.endTime ? formatDate(shift.endTime) : <span style={{ color: 'green' }}>Активна</span>}</td>
                    <td className={styles.moneyCell}>{formatMoney(shift.startBalance)}</td>
                    <td className={styles.moneyCell}>{formatMoney(shift.incasation)}</td>
                    <td className={styles.moneyCell} style={{ fontWeight: 'bold' }}>{formatMoney(shift.totalSalesCash)}</td>
                    <td className={styles.moneyCell} style={getDiffStyle(shift.cashDifference)}>{formatMoney(shift.cashDifference)}</td>
                    <td style={{ textAlign: 'right', color: '#6b7280' }}>
                      {expandedId === shift.id ? '▲' : '▼'}
                    </td>
                  </tr>

                  {expandedId === shift.id && (
                    <tr>
                      <td colSpan={8} style={{ padding: 0, background: '#fcfcfc' }}>
                        <div style={{ padding: '20px', borderBottom: '1px solid #eee' }}>

                          {/* Summary Blocks */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                            <div>
                              <div style={{ fontSize: '0.85em', color: '#6b7280', marginBottom: '4px' }}>Книжний баланс:</div>
                              <div style={{ fontWeight: '600', fontSize: '1.1em' }}>{formatMoney(shift.bookBalance)}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.85em', color: '#6b7280', marginBottom: '4px' }}>Фактичний баланс:</div>
                              <div style={{ fontWeight: '600', fontSize: '1.1em' }}>{formatMoney(shift.actualBalance)}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.85em', color: '#6b7280', marginBottom: '4px' }}>Різниця:</div>
                              <div style={{ fontWeight: '600', fontSize: '1.1em', ...getDiffStyle(shift.cashDifference) }}>{formatMoney(shift.cashDifference)}</div>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px dashed #e5e7eb' }}>
                            <div>
                              <div style={{ fontSize: '0.85em', color: '#6b7280', marginBottom: '4px' }}>Готівковий виторг:</div>
                              <div style={{ fontWeight: '600', color: '#059669' }}>{formatMoney(shift.totalSalesCash)}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.85em', color: '#6b7280', marginBottom: '4px' }}>Безготівковий виторг:</div>
                              <div style={{ fontWeight: '600', color: '#059669' }}>{formatMoney(shift.totalSalesCard
                              )}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.85em', color: '#6b7280', marginBottom: '4px' }}>Приходи:</div>
                              <div style={{ fontWeight: '600', color: '#059669' }}>{formatMoney(shift.income)}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.85em', color: '#6b7280', marginBottom: '4px' }}>Витрати:</div>
                              <div style={{ fontWeight: '600', color: '#dc2626' }}>{formatMoney(shift.totalExpenses
                              )}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.85em', color: '#6b7280', marginBottom: '4px' }}>Інкасація:</div>
                              <div style={{ fontWeight: '600', color: '#d97706' }}>{formatMoney(shift.incasation)}</div>
                            </div>
                          </div>

                          {/* Action Link */}
                          <div style={{ marginBottom: '15px' }}>
                            <button style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                              + Додати транзакцію
                            </button>
                          </div>

                          {/* Transactions Sub-table */}
                          <table style={{ width: '100%', fontSize: '0.9em', borderCollapse: 'collapse' }}>
                            <thead style={{ textAlign: 'left', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
                              <tr>
                                <th style={{ padding: '8px 0', fontWeight: 500 }}>Категорія</th>
                                <th style={{ padding: '8px 0', fontWeight: 500 }}>Час</th>
                                <th style={{ padding: '8px 0', fontWeight: 500 }}>Сума</th>
                                <th style={{ padding: '8px 0', fontWeight: 500 }}>Працівник</th>
                                <th style={{ padding: '8px 0', fontWeight: 500 }}>Коментар</th>
                                <th style={{ padding: '8px 0', fontWeight: 500 }}>Редагував</th>
                                <th style={{ padding: '8px 0', fontWeight: 500 }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {shift.receipts && shift.receipts.length > 0 ? (
                                shift.receipts.map((t, idx) => (
                                  <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '10px 0' }}>{t.category}</td>
                                    <td style={{ padding: '10px 0' }}>{t.time}</td>
                                    <td style={{ padding: '10px 0' }}>{formatMoney(t.sum)}</td>
                                    <td style={{ padding: '10px 0' }}>{t.employee}</td>
                                    <td style={{ padding: '10px 0', color: '#6b7280' }}>{t.comment || '—'}</td>
                                    <td style={{ padding: '10px 0', color: '#6b7280' }}>{t.editedBy || '—'}</td>
                                    <td style={{ padding: '10px 0', textAlign: 'right' }}>
                                      <button style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', marginRight: '8px' }}>Ред</button>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={7} style={{ padding: '15px 0', textAlign: 'center', color: '#9ca3af', fontStyle: 'italic' }}>
                                    Немає транзакцій в цій зміні
                                  </td>
                                </tr>
                              )}
                            </tbody>
                            {/* Auto-generated system transactions like "Open Shift" / "Close Shift" could be logically added here if backend supports it */}
                          </table>

                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

