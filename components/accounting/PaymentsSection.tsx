"use client";

import React from "react";
import styles from "../../app/accounting/page.module.css";

export interface PaymentRow {
  date: string;
  receiptsCount: number;
  cash: number;
  card: number;
  total: number;
}

interface PaymentTotals {
  receiptsCount: number;
  cash: number;
  card: number;
  total: number;
}

interface PaymentsSectionProps {
  rows: PaymentRow[];
  totals: PaymentTotals;
}

export function PaymentsSection({ rows, totals }: PaymentsSectionProps) {
  return (
    <section className={styles.card}>
      <div className={styles.clientsHeaderRow}>
        <div className={styles.clientsTitleBlock}>
          <h2 className={styles.clientsTitle}>Оплати</h2>
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
        <span />
        <div className={styles.clientsToolbarLeftButtons}>
          <button className={styles.toolbarLink} type="button">
            Оплати
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
              <th>Дата</th>
              <th>Кількість чеків</th>
              <th>Готівкою</th>
              <th>Карткою</th>
              <th>Всього</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.date}>
                <td>{r.date}</td>
                <td>{r.receiptsCount}</td>
                <td>{r.cash.toFixed(2)} ₴</td>
                <td>{r.card.toFixed(2)} ₴</td>
                <td>{r.total.toFixed(2)} ₴</td>
              </tr>
            ))}
            <tr className={styles.clientsTotalRow}>
              <td>Разом</td>
              <td>{totals.receiptsCount}</td>
              <td>{totals.cash.toFixed(2)} ₴</td>
              <td>{totals.card.toFixed(2)} ₴</td>
              <td>{totals.total.toFixed(2)} ₴</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
