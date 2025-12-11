// components/accounting/SalarySection.tsx
import React from 'react';
import styles from '../../app/accounting/page.module.css';

interface SalaryRow {
  id: string;
  employee: string;
  position: string;
  salary: number;
  bonus: number;
  fine: number;
  toPay: number;
  status: 'paid' | 'pending' | 'overdue';
}

interface SalarySectionProps {
  rows: SalaryRow[];
  onPay: (id: string) => void;
  onView: (id: string) => void;
  onExport: () => void;
}

export function SalarySection({ rows, onPay, onView, onExport }: SalarySectionProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uk-UA', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className={`${styles.statusBadge} ${styles.statusSuccess}`}>Оплачено</span>;
      case 'overdue':
        return <span className={`${styles.statusBadge} ${styles.statusDanger}`}>Прострочено</span>;
      default:
        return <span className={`${styles.statusBadge} ${styles.statusWarning}`}>Очікує</span>;
    }
  };

  return (
    <section className={styles.card}>
      <div className={styles.clientsHeaderRow}>
        <div className={styles.clientsTitleBlock}>
          <h2 className={styles.clientsTitle}>Зарплата</h2>
        </div>
        <div className={styles.clientsToolbarRight}>
          <button className={styles.toolbarButton} type="button" onClick={onExport}>
            Експорт
          </button>
          <button className={styles.toolbarButton} type="button">
            Друк
          </button>
          <div className={styles.dateRangeContainer}>
            <span>Період:</span>
            <input type="month" className={styles.dateInput} />
          </div>
        </div>
      </div>

      <div className={styles.clientsToolbarRow}>
        <input 
          className={styles.quickSearch} 
          placeholder="Швидкий пошук" 
        />
        <div className={styles.clientsToolbarLeftButtons}>
          <button className={styles.toolbarLink} type="button">
            Статус
          </button>
          <button className={styles.toolbarLink} type="button">
            + Фільтр
          </button>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Працівник</th>
              <th>Посада</th>
              <th>Оклад</th>
              <th>Премія</th>
              <th>Штраф</th>
              <th>До виплати</th>
              <th>Статус</th>
              <th>Дії</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.noData}>
                  Немає даних для відображення
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.employee}</td>
                  <td>{row.position}</td>
                  <td>{formatCurrency(row.salary)}</td>
                  <td>{row.bonus > 0 ? `+${formatCurrency(row.bonus)}` : '-'}</td>
                  <td>{row.fine > 0 ? `-${formatCurrency(row.fine)}` : '-'}</td>
                  <td className={styles.bold}>{formatCurrency(row.toPay)}</td>
                  <td>{getStatusBadge(row.status)}</td>
                  <td>
                    <div className={styles.actions}>
                      {row.status !== 'paid' && (
                        <button 
                          className={styles.actionButton}
                          onClick={() => onPay(row.id)}
                        >
                          Виплатити
                        </button>
                      )}
                      <button 
                        className={`${styles.actionButton} ${styles.secondaryButton}`}
                        onClick={() => onView(row.id)}
                      >
                        Деталі
                      </button>
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