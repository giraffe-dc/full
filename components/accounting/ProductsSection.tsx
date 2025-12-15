
import React, { useState, useMemo } from "react";
import styles from "./ClientsSection.module.css";

export interface ProductRow {
  name: string;
  category?: string;
  modifier?: string;
  count: number;
  grossRevenue: number;
  discount: number;
  revenue: number;
  profit: number;
  margin?: number;
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
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    let res = rows;
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(r => r.name.toLowerCase().includes(q));
    }
    return res;
  }, [rows, search]);

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + "Name,Category,Count,Revenue,Profit,Margin\n"
      + filteredRows.map(e => `${e.name},${e.category || ''},${e.count},${e.revenue},${e.profit},${e.margin?.toFixed(2)}%`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "products_analytics.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h2 className={styles.title}>Товари (Аналітика)</h2>
          <span className={styles.countBadge}>{rows.length} позицій</span>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.toolbarButton} onClick={handleExport}>
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
            placeholder="Пошук товару..."
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
                <th>Товар</th>
                <th>Категорія</th>
                <th>Продано</th>
                <th>Виторг</th>
                {/* <th>Знижка</th> */}
                <th>Прибуток</th>
                <th>Маржа</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r, i) => (
                <tr key={i}>
                  <td className={styles.clientInfo}>
                    <h3>{r.name}</h3>
                    {r.modifier && <p>{r.modifier}</p>}
                  </td>
                  <td><span style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: '12px', fontSize: '0.85em' }}>{r.category || '—'}</span></td>
                  <td>{r.count} шт.</td>
                  <td className={styles.moneyCell}>{r.revenue.toFixed(2)} ₴</td>
                  {/* <td className={styles.moneyCell}>{r.discount.toFixed(2)} ₴</td> */}
                  <td className={`${styles.moneyCell} ${styles.profitCell}`}>{r.profit.toFixed(2)} ₴</td>
                  <td className={styles.moneyCell}>{r.margin ? r.margin.toFixed(1) : 0}%</td>
                </tr>
              ))}
              {filteredRows.length > 0 && (
                <tr className={styles.totalRow}>
                  <td>Разом</td>
                  <td></td>
                  <td>{totals.count} шт.</td>
                  <td>{totals.revenue.toFixed(2)} ₴</td>
                  {/* <td>{totals.discount.toFixed(2)} ₴</td> */}
                  <td>{totals.profit.toFixed(2)} ₴</td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
          {filteredRows.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Даних не знайдено</div>}
        </div>
      </div>
    </div>
  );
}

