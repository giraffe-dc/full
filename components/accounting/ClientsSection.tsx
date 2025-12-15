
import React, { useState, useMemo } from "react";
import styles from "./ClientsSection.module.css";
import { ClientFormModal } from "./ClientFormModal";

export interface ClientRow {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
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
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredRows = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.phone?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const handleSaveClient = async (client: Partial<ClientRow>) => {
    try {
      const res = await fetch('/api/accounting/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(client)
      });
      if (res.ok) {
        // Should refresh data here. 
        // Since we don't have refresh callback, we'll reload simple way or rely on SWR later.
        window.location.reload();
      } else {
        alert("Error saving client");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving client");
    }
  };

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + "Name,Phone,Cash,Card,Total\n"
      + filteredRows.map(e => `${e.name},${e.phone},${e.cash},${e.card},${e.profit}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "clients_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h2 className={styles.title}>Клієнти</h2>
          <span className={styles.countBadge}>{rows.length} клієнтів</span>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.toolbarButton} onClick={handleExport}>
            ⬇ Експорт
          </button>
          <button className={`${styles.toolbarButton} ${styles.primaryButton}`} onClick={() => setIsModalOpen(true)}>
            + Додати клієнта
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.searchContainer}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            placeholder="Пошук за ім'ям або телефоном..."
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
                <th>Клієнт</th>
                <th>Контакти</th>
                <th>Без знижки</th>
                <th>Готівкою</th>
                <th>Карткою</th>
                <th>Прибуток</th>
                <th>Чеки</th>
                <th>Середній чек</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((c, i) => (
                <tr key={c.id || i}>
                  <td className={styles.clientInfo}>
                    <h3>{c.name}</h3>
                    {c.address && <p>{c.address}</p>}
                  </td>
                  <td>{c.phone || "—"}<br /><span style={{ fontSize: '0.8em', color: '#9ca3af' }}>{c.email}</span></td>
                  <td className={styles.moneyCell}>{c.noDiscount.toFixed(2)} ₴</td>
                  <td className={styles.moneyCell}>{c.cash.toFixed(2)} ₴</td>
                  <td className={styles.moneyCell}>{c.card.toFixed(2)} ₴</td>
                  <td className={`${styles.moneyCell} ${styles.profitCell}`}>{c.profit.toFixed(2)} ₴</td>
                  <td>{c.receipts} шт.</td>
                  <td className={styles.moneyCell}>{c.avgCheck.toFixed(2)} ₴</td>
                </tr>
              ))}
              {filteredRows.length > 0 && (
                <tr className={styles.totalRow}>
                  <td>Разом</td>
                  <td></td>
                  <td>{totals.noDiscount.toFixed(2)} ₴</td>
                  <td>{totals.cash.toFixed(2)} ₴</td>
                  <td>{totals.card.toFixed(2)} ₴</td>
                  <td>{totals.profit.toFixed(2)} ₴</td>
                  <td>{totals.receipts} шт.</td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
          {filteredRows.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Клієнтів не знайдено</div>}
        </div>
      </div>

      {isModalOpen && (
        <ClientFormModal
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveClient}
        />
      )}
    </div>
  );
}

