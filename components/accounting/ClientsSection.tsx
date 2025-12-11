"use client";

import React from "react";
import styles from "../../app/accounting/page.module.css";

export interface ClientRow {
  name: string;
  phone: string;
  noDiscount: number;
  cash: number;
  card: number;
  profit: number;
  receipts: number;
  avgCheck: number;
}

interface ClientsTotals {
  noDiscount: number;
  cash: number;
  card: number;
  profit: number;
  receipts: number;
}

interface ClientsSectionProps {
  rows: ClientRow[];
  totals: ClientsTotals;
}

export function ClientsSection({ rows, totals }: ClientsSectionProps) {
  return (
    <section className={styles.card}>
      <div className={styles.clientsHeaderRow}>
        <div className={styles.clientsTitleBlock}>
          <h2 className={styles.clientsTitle}>Клієнти</h2>
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
            Група
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
              <th>Клієнт</th>
              <th>Телефон</th>
              <th>Без знижки</th>
              <th>Готівкою</th>
              <th>Карткою</th>
              <th>Прибуток</th>
              <th>Чеки</th>
              <th>Середній чек</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.name}>
                <td>{c.name}</td>
                <td>{c.phone || "—"}</td>
                <td>{c.noDiscount.toFixed(2)} ₴</td>
                <td>{c.cash.toFixed(2)} ₴</td>
                <td>{c.card.toFixed(2)} ₴</td>
                <td>{c.profit.toFixed(2)} ₴</td>
                <td>{c.receipts} шт.</td>
                <td>{c.avgCheck.toFixed(2)} ₴</td>
              </tr>
            ))}
            <tr className={styles.clientsTotalRow}>
              <td>Разом</td>
              <td></td>
              <td>{totals.noDiscount.toFixed(2)} ₴</td>
              <td>{totals.cash.toFixed(2)} ₴</td>
              <td>{totals.card.toFixed(2)} ₴</td>
              <td>{totals.profit.toFixed(2)} ₴</td>
              <td>{totals.receipts} шт.</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
