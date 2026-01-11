
import React, { useState, useMemo } from "react";
import styles from "./ClientsSection.module.css";
import { ClientFormModal } from "./ClientFormModal";
import { useToast } from "../ui/ToastContext";

export interface ClientRow {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  comment?: string;
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
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRow | undefined>(undefined);
  const [selectedClient, setSelectedClient] = useState<ClientRow | undefined>(undefined);

  const filteredRows = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.phone?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const handleEditClient = (client: ClientRow, e: React.MouseEvent) => {
    e.stopPropagation(); // Запобігаємо спрацюванню onClick на рядку
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleViewClient = (client: ClientRow) => {
    setSelectedClient(client);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClient(undefined);
  };

  const handleSaveClient = async (client: Partial<ClientRow>): Promise<boolean> => {
    try {
      const res = await fetch('/api/accounting/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...client,
          id: editingClient?.id // Додаємо id якщо редагуємо
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Клієнта збережено");
        // Should refresh data here. 
        // Since we don't have refresh callback, we'll reload simple way or rely on SWR later.
        window.location.reload();
        return true;
      } else {
        if (data.error === 'duplicate_phone') {
          toast.error(`❌ Помилка: ${data.message}`);
        } else {
          toast.error("❌ Помилка збереження клієнта");
        }
        return false; // Повертаємо false при помилці
      }
    } catch (e) {
      console.error(e);
      toast.error("❌ Помилка збереження клієнта");
      return false; // Повертаємо false при помилці
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
                <th>Дії</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((c, i) => (
                <tr
                  key={c.id || i}
                  onClick={() => handleViewClient(c)}
                  style={{ cursor: 'pointer' }}
                >
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
                  <td>
                    <button
                      onClick={(e) => handleEditClient(c, e)}
                      className={styles.editButton}
                      title="Редагувати клієнта"
                    >
                      ✏️
                    </button>
                  </td>
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
          onClose={handleCloseModal}
          onSave={handleSaveClient}
          client={editingClient}
        />
      )}

      {selectedClient && (
        <div className={styles.modalOverlay} onClick={() => setSelectedClient(undefined)}>
          <div className={styles.detailsModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.detailsHeader}>
              <h2>Деталі клієнта</h2>
              <button className={styles.closeButton} onClick={() => setSelectedClient(undefined)}>×</button>
            </div>

            <div className={styles.detailsContent}>
              <div className={styles.detailsSection}>
                <h3>Основна інформація</h3>
                <div className={styles.detailsGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Ім'я:</span>
                    <span className={styles.detailValue}>{selectedClient.name}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Телефон:</span>
                    <span className={styles.detailValue}>{selectedClient.phone || "—"}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Email:</span>
                    <span className={styles.detailValue}>{selectedClient.email || "—"}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Адреса:</span>
                    <span className={styles.detailValue}>{selectedClient.address || "—"}</span>
                  </div>
                  {selectedClient.comment && (
                    <div className={styles.detailItem} style={{ gridColumn: '1 / -1' }}>
                      <span className={styles.detailLabel}>Коментар:</span>
                      <span className={styles.detailValue}>{selectedClient.comment}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.detailsSection}>
                <h3>Статистика покупок</h3>
                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <div className={styles.statLabel}>Всього чеків</div>
                    <div className={styles.statValue}>{selectedClient.receipts}</div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statLabel}>Середній чек</div>
                    <div className={styles.statValue}>{selectedClient.avgCheck.toFixed(2)} ₴</div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statLabel}>Готівкою</div>
                    <div className={styles.statValue}>{selectedClient.cash.toFixed(2)} ₴</div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statLabel}>Карткою</div>
                    <div className={styles.statValue}>{selectedClient.card.toFixed(2)} ₴</div>
                  </div>
                  <div className={styles.statCard} style={{ gridColumn: '1 / -1' }}>
                    <div className={styles.statLabel}>Загальний прибуток</div>
                    <div className={styles.statValue} style={{ color: '#059669', fontSize: '1.5rem' }}>
                      {selectedClient.profit.toFixed(2)} ₴
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.detailsActions}>
                <button
                  className={styles.editButtonLarge}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedClient(undefined);
                    handleEditClient(selectedClient, e as any);
                  }}
                >
                  ✏️ Редагувати
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

