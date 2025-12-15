import React, { useState, useMemo } from "react";
import styles from "./ClientsSection.module.css";
import Link from "next/link";

export interface StaffRow {
  id?: string;
  name: string;
  position: string;
  phone: string;
  email: string;
  salary: number;
  revenue: number;
  profit: number;
  receipts: number;
  avgCheck: number;
  avgTime: string;
  workedTime: string;
}

interface StaffTotals {
  revenue: number;
  profit: number;
  receipts: number;
}

interface StaffSectionProps {
  rows: StaffRow[];
  totals: StaffTotals;
}

export function StaffSection({ rows, totals }: StaffSectionProps) {
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.position.toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h2 className={styles.title}>Працівники</h2>
          <span className={styles.countBadge}>{rows.length} осіб</span>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.toolbarButton}>
            ⬇ Експорт
          </button>
          <Link href="/staff" className={`${styles.toolbarButton} ${styles.primaryButton}`}>
            ⚙ Управління персоналом
          </Link>
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.searchContainer}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            placeholder="Пошук працівника..."
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
                <th>Працівник</th>
                <th>Контакти</th>
                <th>Виторг</th>
                <th>Прибуток</th>
                <th>Чеки</th>
                <th>Середній чек</th>
                <th>Час зміні</th>
                <th>Всього відпр.</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r, i) => (
                <tr key={r.id || i}>
                  <td className={styles.clientInfo}>
                    <h3>{r.name}</h3>
                    <p>{r.position}</p>
                  </td>
                  <td>{r.phone || "—"}<br /><span style={{ fontSize: '0.8em', color: '#9ca3af' }}>{r.email}</span></td>
                  <td className={styles.moneyCell}>{r.revenue.toFixed(2)} ₴</td>
                  <td className={`${styles.moneyCell} ${styles.profitCell}`}>{r.profit.toFixed(2)} ₴</td>
                  <td>{r.receipts} шт.</td>
                  <td className={styles.moneyCell}>{r.avgCheck.toFixed(2)} ₴</td>
                  <td>{r.avgTime}</td>
                  <td>{r.workedTime}</td>
                </tr>
              ))}
              {filteredRows.length > 0 && (
                <tr className={styles.totalRow}>
                  <td>Разом</td>
                  <td></td>
                  <td>{totals.revenue.toFixed(2)} ₴</td>
                  <td>{totals.profit.toFixed(2)} ₴</td>
                  <td>{totals.receipts} шт.</td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
          {filteredRows.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Працівників не знайдено</div>}
        </div>
      </div>
    </div>
  );
}

