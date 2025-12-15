"use client";

import React from "react";
import styles from "../../app/accounting/page.module.css";

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
  };
  onFormChange: (next: TransactionsSectionProps["form"]) => void;
  onSubmit: (e: React.FormEvent) => void;
  // використовуємо any, щоб не дублювати точний тип Transaction із сторінки
  tx: any[];
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
  onEdit,
  onDelete,
}: TransactionsSectionProps) {
  if (!active) return null;

  return (
    <section className={styles.card}>
      <div className={styles.clientsHeaderRow}>
        <div className={styles.clientsTitleBlock}>
          <h2 className={styles.clientsTitle}>Транзакції</h2>
          <span className={styles.clientsCount}>{tx.length}</span>
        </div>
        <div className={styles.clientsToolbarRight}>
          {/* <button className={styles.toolbarButton} type="button">
            Стовпці
          </button>
          <button className={styles.toolbarButton} type="button">
            Експорт
          </button>
          <button className={styles.toolbarButton} type="button">
            Друк
          </button> */}
          {/* <button className={styles.dateRangeButton} type="button">
            За весь час
          </button>
          <button className={styles.toolbarButton} type="button" onClick={onOpenForm}>
            Додати
          </button> */}
        </div>
      </div>

      <div className={styles.clientsToolbarRow}>
        {/* <input className={styles.quickSearch} placeholder="Швидкий пошук" /> */}
        <div className={styles.clientsToolbarLeftButtons}>
            {/* <button className={styles.toolbarLink} type="button">
              Категорія
            </button>
            <button className={styles.toolbarLink} type="button">
              Рахунок
            </button>
            <button className={styles.toolbarLink} type="button">
              + Фільтр
            </button> */}
        </div>
      </div>

      <div className={styles.filters}>
        <input
          type="date"
          placeholder="Від"
          value={filters.startDate}
          onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
          className={styles.filterInput}
        />
        <input
          type="date"
          placeholder="До"
          value={filters.endDate}
          onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
          className={styles.filterInput}
        />
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

      {showForm && (
        <div className={styles.formSection}>
          <form onSubmit={onSubmit} className={styles.form}>
            <h3>Додати / редагувати транзакцію</h3>
            <div className={styles.formRow}>
              <input
                type="date"
                value={form.date}
                onChange={(e) => onFormChange({ ...form, date: e.target.value })}
                required
              />
              <select
                value={form.type}
                onChange={(e) => onFormChange({ ...form, type: e.target.value })}
                required
              >
                <option value="income">Дохід</option>
                <option value="expense">Витрата</option>
              </select>
            </div>
            <input
              placeholder="Опис *"
              value={form.description}
              onChange={(e) => onFormChange({ ...form, description: e.target.value })}
              required
            />
            <div className={styles.formRow}>
              <input
                type="number"
                step="0.01"
                placeholder="Сума *"
                value={form.amount}
                onChange={(e) => onFormChange({ ...form, amount: e.target.value })}
                required
              />
              <select
                value={form.category}
                onChange={(e) => onFormChange({ ...form, category: e.target.value })}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {categoryLabels[cat]}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formActions}>
              <button type="submit" className={styles.saveBtn}>
                Зберегти
              </button>
              <button type="button" onClick={onCloseForm} className={styles.cancelBtn}>
                Скасувати
              </button>
            </div>
          </form>
        </div>
      )}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Опис</th>
                <th>Категорія</th>
                <th>Сума</th>
                <th>Тип</th>
                <th>Дії</th>
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
                tx.map((t) => (
                  <tr key={t._id}>
                    <td>{new Date(t.date).toLocaleDateString("uk-UA")}</td>
                    <td>{t.description}</td>
                    <td>{t.category || "-"}</td>
                    <td>{Number(t.amount).toFixed(2)} ₴</td>
                    <td>
                      <span className={`${styles.typeBadge} ${styles[t.type]}`}>
                        {t.type === "income" ? "Дохід" : "Витрата"}
                      </span>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button onClick={() => onEdit(t)} className={styles.editBtn}>
                          Редагувати
                        </button>
                        <button onClick={() => onDelete(t._id)} className={styles.deleteBtn}>
                          Видалити
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
