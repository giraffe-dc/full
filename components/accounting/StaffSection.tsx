"use client";

import React from "react";
import styles from "../../app/accounting/page.module.css";

export interface StaffRow {
  name: string;
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
  return (
    <section className={styles.card}>
      <div className={styles.clientsHeaderRow}>
        <div className={styles.clientsTitleBlock}>
          <h2 className={styles.clientsTitle}>Працівники</h2>
          <span className={styles.clientsCount}>{rows.length}</span>
        </div>
        <div className={styles.clientsToolbarRight}>
          <button className={styles.toolbarButton} type="button">
            Стовпці
          </button>
          <button className={styles.toolbarButton} type="button">
            Експорт
          </button>
          <button className={styles.toolbarButton} type="button">
            Друк
          </button>
          <button className={styles.dateRangeButton} type="button">
            10 листопада — 10 грудня
          </button>
        </div>
      </div>

      <div className={styles.clientsToolbarRow}>
        <input className={styles.quickSearch} placeholder="Швидкий пошук" />
        <div className={styles.clientsToolbarLeftButtons}>
          <button className={styles.toolbarLink} type="button">
            Офіціант
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
              <th>Офіціант</th>
              <th>Виторг</th>
              <th>Прибуток</th>
              <th>Чеки</th>
              <th>Середній чек</th>
              <th>Середній час</th>
              <th>Відпрацьований час</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td>{r.revenue.toFixed(2)} ₴</td>
                <td>{r.profit.toFixed(2)} ₴</td>
                <td>{r.receipts} шт.</td>
                <td>{r.avgCheck.toFixed(2)} ₴</td>
                <td>{r.avgTime}</td>
                <td>{r.workedTime}</td>
              </tr>
            ))}
            <tr className={styles.clientsTotalRow}>
              <td>Разом</td>
              <td>{totals.revenue.toFixed(2)} ₴</td>
              <td>{totals.profit.toFixed(2)} ₴</td>
              <td>{totals.receipts} шт.</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
