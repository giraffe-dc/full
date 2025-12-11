"use client";

import React from "react";
import styles from "../../app/accounting/page.module.css";

export interface ReceiptRow {
  id: string;
  risk: string;
  waiter: string;
  openedAt: string;
  closedAt: string;
  paid: number;
  discount: number;
  profit: number;
  status: string;
}

interface ReceiptsSectionProps {
  rows: ReceiptRow[];
}

export function ReceiptsSection({ rows }: ReceiptsSectionProps) {
  return (
    <section className={styles.card}>
      <div className={styles.clientsHeaderRow}>
        <div className={styles.clientsTitleBlock}>
          <h2 className={styles.clientsTitle}>Чеки</h2>
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
            10 грудня
          </button>
        </div>
      </div>

      <div className={styles.clientsToolbarRow}>
        <input className={styles.quickSearch} placeholder="Швидкий пошук" />
        <div className={styles.clientsToolbarLeftButtons}>
          <button className={styles.toolbarLink} type="button">
            Чеки з ризиком
          </button>
          <button className={styles.toolbarLink} type="button">
            Зміна
          </button>
          <button className={styles.toolbarLink} type="button">
            Офіціант
          </button>
          <button className={styles.toolbarLink} type="button">
            Оплати
          </button>
          <button className={styles.toolbarLink} type="button">
            Статус
          </button>
          <button className={styles.toolbarLink} type="button">
            Онлайн-замовлення
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
              <th>#</th>
              <th>Ризик</th>
              <th>Офіціант</th>
              <th>Відкритий</th>
              <th>Закритий</th>
              <th>Сплачено</th>
              <th>Знижка в чеку</th>
              <th>Прибуток</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.risk}</td>
                <td>{r.waiter}</td>
                <td>{r.openedAt}</td>
                <td>{r.closedAt}</td>
                <td>{r.paid.toFixed(2)} ₴</td>
                <td>{r.discount.toFixed(2)} ₴</td>
                <td>{r.profit.toFixed(2)} ₴</td>
                <td>{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
