import React, { useState } from 'react';
import { InvoiceRow } from '../../types/accounting';
import styles from './InvoicesSection.module.css';

interface InvoicesSectionProps {
  rows: InvoiceRow[];
  onAddInvoice?: () => void;
  onEditInvoice?: (id: string) => void;
  onDeleteInvoice?: (id: string) => void;
}

export function InvoicesSection({
  rows,
  onAddInvoice,
  onEditInvoice,
  onDeleteInvoice,
}: InvoicesSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRows = rows.filter((row) =>
    row.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    const formatted = Math.abs(amount).toFixed(2);
    return amount < 0 ? `-${formatted}` : formatted;
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return styles.balancePositive;
    if (balance < 0) return styles.balanceNegative;
    return styles.balanceNeutral;
  };

  const totalBalance = rows.reduce((sum, row) => sum + row.balance, 0);

  return (
    <section className={styles.card}>
      <div className={styles.headerRow}>
        <div className={styles.titleBlock}>
          <h2 className={styles.title}>Рахунки</h2>
          <span className={styles.count}>{rows.length}</span>
        </div>
        <div className={styles.toolbarRight}>
          <button className={styles.toolbarButton} type="button">
            🏦 Кошик
          </button>
          <button className={styles.toolbarButton} type="button">
            📊 Звіти
          </button>
          <button className={styles.toolbarButton} type="button">
            📥 Експорт
          </button>
          <button className={styles.toolbarButton} type="button">
            🖨️ Друк
          </button>
          <button
            className={`${styles.toolbarButton} ${styles.buttonPrimary}`}
            type="button"
            onClick={onAddInvoice}
          >
            ➕ Додати
          </button>
        </div>
      </div>

      <div className={styles.toolbarRow}>
        <input
          type="text"
          placeholder="🔍 Швидкий пошук"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
        <div className={styles.toolbarLeftButtons}>
          <button className={styles.toolbarLink} type="button">
            + Фільтр
          </button>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.nameColumn}>Назва</th>
              <th className={styles.typeColumn}>Тип</th>
              <th className={styles.balanceColumn}>Баланс</th>
              <th className={styles.actionsColumn}></th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.noData}>
                  Немає даних для відображення
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row.id}>
                  <td className={styles.nameColumn}>
                    <div className={styles.nameCell}>{row.name}</div>
                  </td>
                  <td className={styles.typeColumn}>{row.type}</td>
                  <td className={`${styles.balanceColumn} ${getBalanceColor(row.balance)}`}>
                    {formatCurrency(row.balance)} ₴
                  </td>
                  <td className={styles.actionsColumn}>
                    <div className={styles.actions}>
                      <button
                        className={styles.actionButton}
                        onClick={() => onEditInvoice?.(row.id)}
                        title="Редагувати"
                      >
                        ✏️
                      </button>
                      <button
                        className={`${styles.actionButton} ${styles.actionDelete}`}
                        onClick={() => onDeleteInvoice?.(row.id)}
                        title="Видалити"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
            {filteredRows.length > 0 && (
              <tr className={styles.totalRow}>
                <td className={styles.nameColumn}>
                  <strong>Разом</strong>
                </td>
                <td className={styles.typeColumn}></td>
                <td className={`${styles.balanceColumn} ${getBalanceColor(totalBalance)}`}>
                  <strong>{formatCurrency(totalBalance)} ₴</strong>
                </td>
                <td className={styles.actionsColumn}></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
