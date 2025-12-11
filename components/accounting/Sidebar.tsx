"use client";

import React, { useState } from "react";
import styles from "../../app/accounting/page.module.css";

export type AccountingSection =
  | "dashboard"
  | "clients"
  | "staff"
  | "categories"
  | "products"
  | "receipts"
  | "revenue"
  | "payments"
  | "taxes"
  | "menu"
  | "stock"
  | "marketing"
  | "access"
  | "venues"
  | "settings"
  | "expenses"
  | "cashShifts"
  | "salary"
  | "accounts"
  | "stockNotes"
  | "stockSupply"
  | "stockMovement"
  | "stockWriteOff"
  | "stockReport"
  | "stockInventory"
  | "stockSuppliers"
  | "stockWarehouses"
  | "stockPacking"
  | "menuProducts"
  | "menuRecipes"
  | "menuSemiFinished"
  | "menuIngredients"
  | "menuProductCategories"
  | "menuIngredientCategories"
  | "menuPrices";

interface AccountingSidebarProps {
  activeSection: AccountingSection;
  onChange: (section: AccountingSection) => void;
}

interface AccordionSection {
  id: string;
  label: string;
  items: Array<{
    id: AccountingSection;
    label: string;
    hint?: string;
  }>;
}

export function AccountingSidebar({ activeSection, onChange }: AccountingSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['statistics', 'finance', 'stock', 'menu']));

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const accordionSections: AccordionSection[] = [
    {
      id: 'statistics',
      label: 'Статистика',
      items: [
        { id: 'dashboard', label: 'Дашборд', hint: 'Загальний огляд' },
        { id: 'clients', label: 'Клієнти', hint: 'База гостей' },
        { id: 'staff', label: 'Працівники', hint: 'Облік персоналу' },
        { id: 'categories', label: 'Категорії', hint: 'Товарів та послуг' },
        { id: 'products', label: 'Товари', hint: 'Номенклатура' },
        { id: 'receipts', label: 'Чеки', hint: 'Список чеків' },
      ],
    },
    {
      id: 'finance',
      label: 'Фінанси',
      items: [
        { id: 'revenue', label: 'Транзакції', hint: 'Усі рухи коштів' },
        { id: 'cashShifts', label: 'Касові зміни', hint: 'Закриття змін' },
        { id: 'salary', label: 'Зарплата', hint: 'Виплати персоналу' },
        { id: 'accounts', label: 'Рахунки', hint: 'Банківські рахунки' },
        { id: 'payments', label: 'Платежі', hint: 'Методи оплати' },
        { id: 'taxes', label: 'Податки', hint: 'Податкові розрахунки' },
      ],
    },
    {
      id: 'stock',
      label: 'Склад',
      items: [
        { id: 'stockNotes', label: 'Запишики' },
        { id: 'stockSupply', label: 'Постачання' },
        { id: 'stockMovement', label: 'Переміщення' },
        { id: 'stockWriteOff', label: 'Списання' },
        { id: 'stockReport', label: 'Звіт за рухом' },
        { id: 'stockInventory', label: 'Інвентаризації' },
        { id: 'stockSuppliers', label: 'Постачальники' },
        { id: 'stockWarehouses', label: 'Склади' },
        { id: 'stockPacking', label: 'Фасування' },
      ],
    },
    {
      id: 'menu',
      label: 'Меню',
      items: [
        { id: 'menuProducts', label: 'Товари' },
        { id: 'menuRecipes', label: 'Тех. картки' },
        { id: 'menuSemiFinished', label: 'Напівфабрикати' },
        { id: 'menuIngredients', label: 'Інгредієнти' },
        { id: 'menuProductCategories', label: 'Категорії товарів та тех. карток' },
        { id: 'menuIngredientCategories', label: 'Категорії інгредієнтів' },
        { id: 'menuPrices', label: 'Ціни' },
      ],
    },
    {
      id: 'operations',
      label: 'Операції',
      items: [
        { id: 'marketing', label: 'Маркетинг', hint: 'Акції та промо' },
      ],
    },
    {
      id: 'service',
      label: 'Сервіс',
      items: [
        { id: 'access', label: 'Доступи', hint: 'Права користувачів' },
        { id: 'venues', label: 'Усі заклади', hint: 'Мережа центрів' },
        { id: 'settings', label: 'Налаштування', hint: 'Фінанси та довідники' },
      ],
    },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarTitle}>Бухгалтерія</div>
      <nav className={styles.nav} aria-label="Навігація по бухгалтерії">
        {accordionSections.map((section) => (
          <div key={section.id} className={styles.accordionSection}>
            <button
              type="button"
              className={styles.accordionHeader}
              onClick={() => toggleSection(section.id)}
            >
              <span className={styles.accordionLabel}>{section.label}</span>
              <span className={`${styles.accordionIcon} ${expandedSections.has(section.id) ? styles.expanded : ''}`}>
                ▼
              </span>
            </button>
            {expandedSections.has(section.id) && (
              <div className={styles.accordionContent}>
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.navItem} ${activeSection === item.id ? styles.navItemActive : ''}`}
                    onClick={() => onChange(item.id)}
                  >
                    <span className={styles.navItemLabel}>{item.label}</span>
                    {item.hint && <span className={styles.navItemHint}>{item.hint}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
