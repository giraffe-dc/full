
import React, { useState, useMemo } from "react";
import styles from "./ClientsSection.module.css";

export interface ReceiptRow {
  id: string;
  receiptNumber: string;
  openedAt: string; // ISO date
  waiter: string;
  status: string;
  total: number;
  discount: number;
  profit: number;
  paymentMethod: string;
  itemsCount: number;
}

interface ReceiptsSectionProps {
  rows: ReceiptRow[];
}

export function ReceiptsSection({ rows }: ReceiptsSectionProps) {
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.receiptNumber.toString().includes(q) ||
        r.waiter.toLowerCase().includes(q) ||
        r.paymentMethod.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleString("uk-UA", { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return <span style={{ color: 'orange' }}>Відкритий</span>;
      case 'closed': return <span style={{ color: 'green' }}>Закритий</span>;
      case 'canceled': return <span style={{ color: 'red' }}>Скасовано</span>;
      default: return status;
    }
  };

  const calculateTotal = (field: keyof ReceiptRow) => {
    return filteredRows.reduce((acc, row) => acc + (Number(row[field]) || 0), 0);
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h2 className={styles.title}>Чеки</h2>
          <span className={styles.countBadge}>{rows.length} операцій</span>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.toolbarButton}>
            ⬇ Експорт
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.searchContainer}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            placeholder="Пошук (номер, офіціант)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Дата</th>
                <th>№ Чеку</th>
                {/* <th>Офіціант</th> */}
                <th>Позицій</th>
                <th>Оплата</th>
                <th>Сума</th>
                <th>Прибуток</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => (
                <tr key={r.id}>
                  <td>{formatDate(r.openedAt)}</td>
                  <td style={{ fontWeight: 500 }}>#{r.receiptNumber}</td>
                  {/* <td>{r.waiter}</td> */}
                  <td>{r.itemsCount}</td>
                  <td>
                    <span className={styles.badge} style={{
                      background: r.paymentMethod === 'card' ? '#e6fffa' : '#fffaf0',
                      color: r.paymentMethod === 'card' ? '#319795' : '#dd6b20'
                    }}>
                      {r.paymentMethod === 'card' ? 'Картка' : r.paymentMethod === 'mixed' ? 'Змішана' : 'Готівка'}
                    </span>
                  </td>
                  <td className={styles.moneyCell}>{r.total.toFixed(2)} ₴</td>
                  <td className={`${styles.moneyCell} ${styles.profitCell}`}>{r.profit.toFixed(2)} ₴</td>
                  <td>{getStatusLabel(r.status)}</td>
                </tr>
              ))}
              {filteredRows.length > 0 && (
                <tr className={styles.totalRow}>
                  <td>Разом</td>
                  <td></td>
                  {/* <td></td> */}
                  <td></td>
                  <td></td>
                  <td>{calculateTotal('total').toFixed(2)} ₴</td>
                  <td>{calculateTotal('profit').toFixed(2)} ₴</td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
          {filteredRows.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Чеків не знайдено</div>}
        </div>
      </div>
    </div>
  );
}
