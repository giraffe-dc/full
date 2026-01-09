"use client";

import React from "react";
import styles from "./TransactionsSection.module.css";

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

  return (
    <section className={styles.card}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div className={styles.titleBlock}>
          <h2 className={styles.title}>Транзакції</h2>
          <span className={styles.count}>{tx.length}</span>
        </div>
        <button
          className={`${styles.toolbarButton} ${styles.addButton}`}
          type="button"
          onClick={onOpenForm}
        >
          <span style={{ fontSize: '1.2em', lineHeight: 1 }}>+</span> Додати транзакцію
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.dateGroup}>
          <span className={styles.filterLabel}>Період:</span>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
            className={styles.filterInput}
          />
          <span style={{ color: '#9ca3af' }}>—</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
            className={styles.filterInput}
          />
        </div>

        <select
          value={filters.type}
          onChange={(e) => onFiltersChange({ ...filters, type: e.target.value })}
          className={styles.filterSelect}
        >
          <option value="">Всі типи</option>
          <option value="income">Доходи</option>
          <option value="expense">Витрати</option>
        </select>

        <select
          value={filters.paymentMethod}
          onChange={(e) => onFiltersChange({ ...filters, paymentMethod: e.target.value })}
          className={styles.filterSelect}
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
        >
          <option value="">Всі категорії</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {categoryLabels[cat]}
            </option>
          ))}
        </select>
      </div>

      {/* Form Section */}
      {showForm && (
        <div className={styles.formSection}>
          <form onSubmit={onSubmit}>
            <div className={styles.formHeader}>
              <h3 className={styles.formTitle}>
                {form.date ? 'Редагувати транзакцію' : 'Нова транзакція'}
              </h3>
              <button type="button" onClick={onCloseForm} className={styles.closeButton}>
                &times;
              </button>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Дата *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => onFormChange({ ...form, date: e.target.value })}
                  required
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Тип *</label>
                <select
                  value={form.type}
                  onChange={(e) => onFormChange({ ...form, type: e.target.value })}
                  required
                  className={styles.select}
                >
                  <option value="income">Дохід</option>
                  <option value="expense">Витрата</option>
                </select>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Опис *</label>
              <input
                placeholder="Наприклад: Закупівля овочів"
                value={form.description}
                onChange={(e) => onFormChange({ ...form, description: e.target.value })}
                required
                className={styles.input}
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Сума *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => onFormChange({ ...form, amount: e.target.value })}
                  required
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Категорія</label>
                <select
                  value={form.category}
                  onChange={(e) => onFormChange({ ...form, category: e.target.value })}
                  className={styles.select}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {categoryLabels[cat]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Рахунок (Гаманець)</label>
              <select
                value={form.moneyAccountId}
                onChange={(e) => onFormChange({ ...form, moneyAccountId: e.target.value })}
                className={styles.select}
              >
                <option value="">-- Не обрано (або авто-вибір) --</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.balance} {acc.currency})
                  </option>
                ))}
              </select>
              <div className={styles.helperText}>
                Якщо не обрано, система спробує використати рахунок за замовчуванням для методу оплати.
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="button" onClick={onCloseForm} className={styles.cancelBtn}>
                Скасувати
              </button>
              <button type="submit" className={styles.saveBtn}>
                Зберегти
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
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
                    <div style={{ fontSize: '0.85em', color: 'var(--gray-500)' }}>
                      {new Date(t.date).toLocaleTimeString("uk-UA", { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{t.description}</div>
                    {t.paymentMethod && (
                      <div style={{ fontSize: '0.85em', color: 'var(--gray-500)' }}>
                        Оплата: {t.paymentMethod === 'cash' ? 'Готівка' : t.paymentMethod === 'card' ? 'Картка' : t.paymentMethod}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={styles.categoryBadge}>
                      {t.category || "Інше"}
                    </span>
                  </td>
                  <td className={t.type === 'income' ? styles.incomeAmount : styles.expenseAmount}>
                    {t.type === 'income' ? '+' : '-'} {Number(t.amount).toFixed(2)} ₴
                  </td>
                  <td>
                    <span className={`${styles.typeBadge} ${t.type === "income" ? styles.income : styles.expense}`}>
                      {t.type === "income" ? "Надходження" : "Витрата"}
                    </span>
                  </td>
                  <td>
                    <span className={styles.sourceBadge}>
                      {t.source === 'manual' ? 'Ручна' : t.source === 'stock' ? 'Склад' : t.source === 'pos' ? 'Каса' : t.source}
                    </span>
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <button onClick={() => onEdit(t)} className={styles.actionBtn}>
                        ✎
                      </button>
                      <button onClick={() => onDelete(t._id)} className={`${styles.actionBtn} ${styles.deleteBtn}`}>
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
    </section>
  );
}
