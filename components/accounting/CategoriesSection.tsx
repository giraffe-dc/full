"use client";

import React from "react";
import styles from "../../app/accounting/page.module.css";

export interface CategoryRow {
  name: string;
  count: number;
  cost: number;
  revenue: number;
  tax: number;
  profit: number;
  foodCostPercent: number;
}

interface CategoryTotals {
  count: number;
  cost: number;
  revenue: number;
  tax: number;
  profit: number;
}

interface CategoriesSectionProps {
  rows: CategoryRow[];
  totals: CategoryTotals;
}

export function CategoriesSection({ rows, totals }: CategoriesSectionProps) {
  return (
    <section className={styles.card}>
      <div className={styles.clientsHeaderRow}>
        <div className={styles.clientsTitleBlock}>
          <h2 className={styles.clientsTitle}>Категорії</h2>
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
            + Фільтр
          </button>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Категорії</th>
              <th>К-сть</th>
              <th>Собівартість</th>
              <th>Виторг</th>
              <th>Сума податку</th>
              <th>Прибуток</th>
              <th>Food cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td>{r.count} шт.</td>
                <td>{r.cost.toFixed(2)} ₴</td>
                <td>{r.revenue.toFixed(2)} ₴</td>
                <td>{r.tax.toFixed(2)} ₴</td>
                <td>{r.profit.toFixed(2)} ₴</td>
                <td>{r.foodCostPercent.toFixed(2)}%</td>
              </tr>
            ))}
            <tr className={styles.clientsTotalRow}>
              <td>Разом</td>
              <td>{totals.count} шт.</td>
              <td>{totals.cost.toFixed(2)} ₴</td>
              <td>{totals.revenue.toFixed(2)} ₴</td>
              <td>{totals.tax.toFixed(2)} ₴</td>
              <td>{totals.profit.toFixed(2)} ₴</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
