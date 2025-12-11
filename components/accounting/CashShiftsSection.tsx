import React from 'react';
import styles from '../../app/accounting/page.module.css';

interface CashShift {
  id: string;
  date: string;
  cashier: string;
  cash: number;
  cashless: number;
  difference: number;
  status: 'opened' | 'closed';
  register: string;
}

interface CashShiftsSectionProps {
  rows: CashShift[];
  onAddShift: () => void;
  onCloseShift: (id: string) => void;
  onOpenShift: (id: string) => void;
  onViewShift: (id: string) => void;
}

export function CashShiftsSection({ rows, onAddShift, onCloseShift, onOpenShift, onViewShift }: CashShiftsSectionProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('uk-UA').format(date);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uk-UA', { 
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    }).format(amount);
  };

  return (
    <section className={styles.card}>
      <div className={styles.clientsHeaderRow}>
        <div className={styles.clientsTitleBlock}>
          <h2 className={styles.clientsTitle}>Касові зміни</h2>
        </div>
        <div className={styles.clientsToolbarRight}>
          <button 
            className={`${styles.toolbarButton} ${styles.primaryButton}`}
            onClick={onAddShift}
          >
            Додати
          </button>
        </div>
      </div>

      <div className={styles.clientsToolbarRow}>
        <div className={styles.dateRangeContainer}>
          <input type="date" className={styles.dateInput} />
          <span>—</span>
          <input type="date" className={styles.dateInput} />
          <button className={styles.dateRangeButton}>
            <span>За весь час</span>
            <svg width="12" height="7" viewBox="0 0 12 7" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Дата</th>
              <th>Каса</th>
              <th>Касир</th>
              <th>Готівка</th>
              <th>Безготівка</th>
              <th>Сума</th>
              <th>Різниця</th>
              <th>Статус</th>
              <th>Дії</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className={styles.noData}>
                  Немає даних для відображення
                </td>
              </tr>
            ) : (
              rows.map((shift) => (
                <tr key={shift.id}>
                  <td>{formatDate(shift.date)}</td>
                  <td>{shift.register}</td>
                  <td>{shift.cashier}</td>
                  <td>{formatCurrency(shift.cash)}</td>
                  <td>{formatCurrency(shift.cashless)}</td>
                  <td>{formatCurrency(shift.cash + shift.cashless)}</td>
                  <td className={shift.difference !== 0 ? styles.warningText : ''}>
                    {shift.difference !== 0 ? formatCurrency(shift.difference) : '—'}
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${
                      shift.status === 'opened' ? styles.statusActive : styles.statusInactive
                    }`}>
                      {shift.status === 'opened' ? 'Відкрита' : 'Закрита'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      {shift.status === 'opened' ? (
                        <button 
                          className={styles.actionButton}
                          onClick={() => onCloseShift(shift.id)}
                        >
                          Закрити
                        </button>
                      ) : (
                        <button 
                          className={styles.actionButton}
                          onClick={() => onViewShift(shift.id)}
                        >
                          Переглянути
                        </button>
                      )}
                      {shift.status === 'closed' && (
                        <button 
                          className={`${styles.actionButton} ${styles.dangerButton}`}
                          onClick={() => onOpenShift(shift.id)}
                        >
                          Відкрити
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
