"use client";

import React from "react";
import styles from "../../app/accounting/page.module.css";

export interface ProductRow {
  name: string;
  modifier: string;
  count: number;
  grossRevenue: number;
  discount: number;
  revenue: number;
  profit: number;
}

interface ProductTotals {
  count: number;
  grossRevenue: number;
  discount: number;
  revenue: number;
  profit: number;
}

interface ProductsSectionProps {
  rows: ProductRow[];
  totals: ProductTotals;
}

export function ProductsSection({ rows, totals }: ProductsSectionProps) {
  return (
    <section className={styles.card}>
      <div className={styles.clientsHeaderRow}>
        <div className={styles.clientsTitleBlock}>
          <h2 className={styles.clientsTitle}>Товари</h2>
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
            Категорії
          </button>
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
              <th>Товар</th>
              <th>Модифікатор</th>
              <th>К-сть</th>
              <th>Валовий виторг</th>
              <th>Знижка</th>
              <th>Виторг</th>
              <th>Прибуток</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td>{r.modifier || "—"}</td>
                <td>{r.count} шт.</td>
                <td>{r.grossRevenue.toFixed(2)} ₴</td>
                <td>{r.discount.toFixed(2)} ₴</td>
                <td>{r.revenue.toFixed(2)} ₴</td>
                <td>{r.profit.toFixed(2)} ₴</td>
              </tr>
            ))}
            <tr className={styles.clientsTotalRow}>
              <td>Разом</td>
              <td></td>
              <td>{totals.count} шт.</td>
              <td>{totals.grossRevenue.toFixed(2)} ₴</td>
              <td>{totals.discount.toFixed(2)} ₴</td>
              <td>{totals.revenue.toFixed(2)} ₴</td>
              <td>{totals.profit.toFixed(2)} ₴</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
