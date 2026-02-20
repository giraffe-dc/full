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
    toMoneyAccountId: string,
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

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ padding: '16px', borderRadius: '12px', background: 'white', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '4px' }}>Доходи</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#22c55e' }}>
            {tx.reduce((acc, t) => t.type === 'income' ? acc + Number(t.amount) : acc, 0).toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴
          </div>
        </div>
        <div style={{ padding: '16px', borderRadius: '12px', background: 'white', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '4px' }}>Витрати</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#ef4444' }}>
            {tx.reduce((acc, t) => t.type === 'expense' ? acc + Number(t.amount) : acc, 0).toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴
          </div>
        </div>
        <div style={{ padding: '16px', borderRadius: '12px', background: 'white', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '4px' }}>Баланс</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#3b82f6' }}>
            {tx.reduce((acc, t) => t.type === 'income' ? acc + Number(t.amount) : acc - Number(t.amount), 0).toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴
          </div>
        </div>
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
      {/* {showForm && (
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
      )} */}

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead className={styles.hiddenThead}>
            <tr>
              <th style={{ width: '120px' }}>Дата</th>
              <th>Опис / Категорія</th>
              <th>Опис / Категорія</th>
              <th style={{ textAlign: 'right' }}>Сума</th>
              <th>Рахунок</th>
              <th style={{ width: '100px', textAlign: 'right' }}>Дії</th>
            </tr>
          </thead>
          <tbody>
            {tx.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.empty}>
                  Транзакцій не знайдено
                </td>
              </tr>
            ) : (
              (() => {
                // Group by date
                const groups: Record<string, any[]> = {};
                const sortedTx = [...tx].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                sortedTx.forEach(t => {
                  const d = new Date(t.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
                  if (!groups[d]) groups[d] = [];
                  groups[d].push(t);
                });

                return Object.entries(groups).map(([dateLabel, groupTx]) => (
                  <React.Fragment key={dateLabel}>
                    {/* Date Header Row */}
                    <tr className={styles.groupHeaderRow}>
                      <td className={styles.groupDateCell}>{dateLabel}</td>
                      <td colSpan={5}></td>
                    </tr>
                    {groupTx.map((t) => {
                      const fromAcc = accounts.find(a => a.id === t.moneyAccountId);
                      const toAcc = accounts.find(a => a.id === t.toMoneyAccountId);

                      return (
                        <tr key={t._id} className={styles.txRow}>
                          <td className={styles.timeCell}>
                            {/* Small empty cell for spacing under date */}
                          </td>
                          <td className={styles.categoryCell}>
                            <div className={styles.categoryBadgeWrapper}>
                              {t.type === 'transfer' ? 'Перекази' : (
                                t.category === 'sales' ? 'Касові зміни' :
                                  (t.category === 'incasation' ? 'Інкасація' : (categoryLabels[t.category] || t.category || "Інше"))
                              )}
                              {!(t.type === 'transfer' || t.category === 'sales' || t.category === 'incasation') && (
                                <span className={styles.dropdownArrow}>▾</span>
                              )}
                            </div>
                          </td>
                          <td className={styles.descriptionCell}>
                            <div className={styles.txDescription}>{t.description}</div>
                          </td>
                          <td className={`${styles.amountCell} ${t.type === 'income' ? styles.incomeAmount : (t.type === 'expense' ? styles.expenseAmount : '')}`}>
                            {t.type === 'income' ? '' : (t.type === 'expense' ? '-' : '')}
                            {Number(t.amount).toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴
                          </td>
                          <td className={styles.accountCell}>
                            {t.type === 'transfer' ? (
                              <div className={styles.transferPath}>
                                {fromAcc?.name || '...'} → {toAcc?.name || '...'}
                              </div>
                            ) : (
                              fromAcc?.name || 'Готівка'
                            )}
                          </td>
                          <td className={styles.actionsCell}>
                            <div className={styles.rowActions}>
                              <button onClick={() => onEdit(t)} className={styles.editLink}>Ред.</button>
                              <button onClick={() => onDelete(t._id)} className={styles.moreBtn}>•••</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ));
              })()
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
