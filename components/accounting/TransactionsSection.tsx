"use client";

import React from "react";
import styles from "../../app/accounting/page.module.css";

import { MoneyAccount } from "../../types/accounting";

interface Filters {
  startDate: string;
  endDate: string;
  type: string;
  category: string;
  paymentMethod: string;
  source: string;
}

interface TransactionsSectionProps {
  active: boolean;
  filters: Filters;
  onFiltersChange: (next: Filters) => void;
  categories: string[];
  categoryLabels: Record<string, string>;
  showForm: boolean;
  onCloseForm: () => void;
  onOpenForm: () => void;
  form: {
    date: string;
    description: string;
    amount: string;
    type: string;
    category: string;
    paymentMethod: string,
    source: string,
    visits: string,
    moneyAccountId: string,
  };
  onFormChange: (next: TransactionsSectionProps["form"]) => void;
  onSubmit: (e: React.FormEvent) => void;
  // використовуємо any, щоб не дублювати точний тип Transaction із сторінки
  tx: any[];
  accounts: MoneyAccount[];
  onEdit: (t: any) => void;
  onDelete: (id: string) => void;
}

export function TransactionsSection({
  active,
  filters,
  onFiltersChange,
  categories,
  categoryLabels,
  showForm,
  onCloseForm,
  onOpenForm,
  form,
  onFormChange,
  onSubmit,
  tx,
  accounts,
  onEdit,
  onDelete,
}: TransactionsSectionProps) {
  if (!active) return null;
  console.log(accounts);
  return (
    <section className={styles.card}>
      <div className={styles.clientsHeaderRow}>
        <div className={styles.clientsTitleBlock}>
          <h2 className={styles.clientsTitle}>Транзакції</h2>
          <span className={styles.clientsCount}>{tx.length}</span>
        </div>
        <div className={styles.clientsToolbarRight}>
          <button
            className={styles.toolbarButton}
            type="button"
            onClick={onOpenForm}
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              fontWeight: 600,
              padding: '8px 16px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '1.2em', lineHeight: 1 }}>+</span> Додати транзакцію
          </button>
        </div>
      </div>

      <div className={styles.filters} style={{
        display: 'flex',
        gap: '12px',
        padding: '16px',
        backgroundColor: '#f9fafb',
        borderRadius: '12px',
        flexWrap: 'wrap',
        alignItems: 'center',
        border: '1px solid #e5e7eb',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#6b7280', fontSize: '0.9em', fontWeight: 500 }}>Період:</span>
          <input
            type="date"
            placeholder="Від"
            value={filters.startDate}
            onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
            className={styles.filterInput}
            style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '6px 10px' }}
          />
          <span style={{ color: '#9ca3af' }}>-</span>
          <input
            type="date"
            placeholder="До"
            value={filters.endDate}
            onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
            className={styles.filterInput}
            style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '6px 10px' }}
          />
        </div>

        <div style={{ height: '24px', width: '1px', backgroundColor: '#d1d5db', margin: '0 8px' }}></div>

        <select
          value={filters.type}
          onChange={(e) => onFiltersChange({ ...filters, type: e.target.value })}
          className={styles.filterSelect}
          style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '6px 10px' }}
        >
          <option value="">Всі типи</option>
          <option value="income">Доходи</option>
          <option value="expense">Витрати</option>
        </select>
        <select
          value={filters.paymentMethod}
          onChange={(e) => onFiltersChange({ ...filters, paymentMethod: e.target.value })}
          className={styles.filterSelect}
          style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '6px 10px' }}
        >
          <option value="">Всі методи оплати</option>
          <option value="cash">Готівка</option>
          <option value="card">Карта</option>
          <option value="bonus">Бонуси</option>
        </select>
        <select
          value={filters.source}
          onChange={(e) => onFiltersChange({ ...filters, source: e.target.value })}
          className={styles.filterSelect}
          style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '6px 10px' }}
        >
          <option value="">Всі джерела</option>
          <option value="onsite">У залі</option>
          <option value="online">Онлайн</option>
          <option value="party">День народження</option>
        </select>
        <select
          value={filters.category}
          onChange={(e) => onFiltersChange({ ...filters, category: e.target.value })}
          className={styles.filterSelect}
          style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '6px 10px' }}
        >
          <option value="">Всі категорії</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {categoryLabels[cat]}
            </option>
          ))}
        </select>
      </div>

      {showForm && (
        <div className={styles.formSection} style={{
          marginBottom: '24px',
          padding: '24px',
          backgroundColor: '#fff',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          border: '1px solid #e5e7eb'
        }}>
          <form onSubmit={onSubmit} className={styles.form}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.25em', fontWeight: 600, margin: 0 }}>
                {form.date ? 'Редагувати транзакцію' : 'Нова транзакція'}
              </h3>
              <button type="button" onClick={onCloseForm} style={{ background: 'none', border: 'none', fontSize: '1.5em', cursor: 'pointer', color: '#6b7280' }}>
                &times;
              </button>
            </div>

            <div className={styles.formRow} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85em', color: '#4b5563', marginBottom: '4px' }}>Дата *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => onFormChange({ ...form, date: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85em', color: '#4b5563', marginBottom: '4px' }}>Тип *</label>
                <select
                  value={form.type}
                  onChange={(e) => onFormChange({ ...form, type: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                >
                  <option value="income">Дохід</option>
                  <option value="expense">Витрата</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85em', color: '#4b5563', marginBottom: '4px' }}>Опис *</label>
              <input
                placeholder="Наприклад: Закупівля овочів"
                value={form.description}
                onChange={(e) => onFormChange({ ...form, description: e.target.value })}
                required
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
              />
            </div>

            <div className={styles.formRow} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85em', color: '#4b5563', marginBottom: '4px' }}>Сума *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => onFormChange({ ...form, amount: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85em', color: '#4b5563', marginBottom: '4px' }}>Категорія</label>
                <select
                  value={form.category}
                  onChange={(e) => onFormChange({ ...form, category: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {categoryLabels[cat]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.85em', color: '#4b5563', marginBottom: '4px' }}>Рахунок (Гаманець)</label>
              <select
                value={form.moneyAccountId}
                onChange={(e) => onFormChange({ ...form, moneyAccountId: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
              >
                <option value="">-- Не обрано (або авто-вибір) --</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.balance} {acc.currency})
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '0.75em', color: '#6b7280', marginTop: '4px' }}>
                Якщо не обрано, система спробує використати рахунок за замовчуванням для методу оплати.
              </div>
            </div>

            <div className={styles.formActions} style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" onClick={onCloseForm} className={styles.cancelBtn} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer' }}>
                Скасувати
              </button>
              <button type="submit" className={styles.saveBtn} style={{ padding: '8px 24px', borderRadius: '6px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: 500 }}>
                Зберегти
              </button>
            </div>
          </form>
        </div >
      )
      }

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Дата</th>
              <th>Опис</th>
              <th>Категорія</th>
              <th>Сума</th>
              <th>Тип</th>
              <th>Джерело</th>
              <th>Дії</th>
            </tr>
          </thead>
          <tbody>
            {tx.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.empty}>
                  Транзакцій не знайдено
                </td>
              </tr>
            ) : (
              tx.map((t) => (
                <tr key={t._id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{new Date(t.date).toLocaleDateString("uk-UA")}</div>
                    <div style={{ fontSize: '0.8em', color: '#9ca3af' }}>{new Date(t.date).toLocaleTimeString("uk-UA", { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{t.description}</div>
                    {t.paymentMethod && <div style={{ fontSize: '0.8em', color: '#666' }}>Оплата: {t.paymentMethod === 'cash' ? 'Готівка' : t.paymentMethod === 'card' ? 'Картка' : t.paymentMethod}</div>}
                  </td>
                  <td>
                    <span style={{ padding: '4px 8px', borderRadius: '12px', background: '#f3f4f6', fontSize: '0.85em', color: '#4b5563' }}>
                      {t.category || "Інше"}
                    </span>
                  </td>
                  <td style={{
                    color: t.type === 'income' ? '#10b981' : '#ef4444',
                    fontWeight: 600,
                    fontSize: '1.05em'
                  }}>
                    {t.type === 'income' ? '+' : '-'} {Number(t.amount).toFixed(2)} ₴
                  </td>
                  <td>
                    <span className={`${styles.typeBadge} ${styles[t.type]}`}>
                      {t.type === "income" ? "Надходження" : "Витрата"}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.9em', color: '#6b7280' }}>
                      {t.source === 'manual' ? 'Ручна' : t.source === 'stock' ? 'Склад' : t.source === 'pos' ? 'Каса' : t.source}
                    </span>
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      {/* Only allow editing manual transactions potentially, but for now allow all */}
                      <button onClick={() => onEdit(t)} className={styles.editBtn}>
                        ✎
                      </button>
                      <button onClick={() => onDelete(t._id)} className={styles.deleteBtn}>
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section >
  );
}
