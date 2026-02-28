"use client";

import React, { useState, useEffect } from "react";
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import styles from "./Sidebar.module.css";

export type AccountingSection =
  | "dashboard"
  | "clients"
  | "staff"
  | "categories"
  | "products"
  | "receipts" // redirects to /accounting/checks
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
  | "stockBalances"
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
  | "menuIngredients"
  | "menuProductCategories"
  | "menuIngredientCategories"
  | "expenseCategories"
  | "pnl";

interface AccordionSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: Array<{
    id: AccountingSection;
    label: string;
    hint?: string;
  }>;
}

const Icons = {
  Stats: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"></path></svg>,
  Finance: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>,
  Stock: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>,
  Menu: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18"></path></svg>,
  Ops: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
  Service: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
};

export function AccountingSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSection = searchParams.get('section') as AccountingSection || 'dashboard';

  // Logic to determine active section
  const isActive = (id: string) => {
    if (id === 'receipts' && pathname.includes('/accounting/checks')) return true;
    if (id !== 'receipts' && !pathname.includes('/accounting/checks') && currentSection === id) return true;
    return false;
  };

  const getLink = (id: string) => {
    if (id === 'receipts') return '/accounting/checks';
    return `/accounting?section=${id}`;
  };

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['stock', 'menu', 'statistics']));

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
      icon: Icons.Stats,
      items: [
        { id: 'dashboard', label: 'Дашборд', hint: 'Overview' },
        { id: 'clients', label: 'Клієнти' },
        { id: 'staff', label: 'Працівники' },
        { id: 'products', label: 'Товари' },
        { id: 'receipts', label: 'Чеки' },
      ],
    },
    {
      id: 'finance',
      label: 'Фінанси',
      icon: Icons.Finance,
      items: [
        { id: 'revenue', label: 'Транзакції' },
        { id: 'cashShifts', label: 'Касові зміни' },
        { id: 'salary', label: 'Зарплата' },
        { id: 'accounts', label: 'Рахунки' },
        { id: 'pnl', label: 'P&L Звіт' },
        { id: 'taxes', label: 'Податки' },
      ],
    },
    {
      id: 'stock',
      label: 'Склад',
      icon: Icons.Stock,
      items: [
        { id: 'stockBalances', label: 'Залишки', hint: 'На складах' },
        { id: 'stockSupply', label: 'Постачання', hint: 'Прихід' },
        { id: 'stockMovement', label: 'Переміщення', hint: 'Рух' },
        { id: 'stockWriteOff', label: 'Списання', hint: 'Акти' },
        { id: 'stockInventory', label: 'Інвентаризація' },
        { id: 'stockSuppliers', label: 'Постачальники' },
        { id: 'stockWarehouses', label: 'Склади' },
      ],
    },
    {
      id: 'menu',
      label: 'Меню',
      icon: Icons.Menu,
      items: [
        { id: 'menuProducts', label: 'Товари меню' },
        { id: 'menuRecipes', label: 'Тех. картки' },
        { id: 'menuIngredients', label: 'Інгредієнти' },
        { id: 'menuProductCategories', label: 'Категорії' },
      ],
    },
    {
      id: 'operations',
      label: 'Операції',
      icon: Icons.Ops,
      items: [
        { id: 'marketing', label: 'Маркетинг' },
      ],
    },
    {
      id: 'service',
      label: 'Сервіс',
      icon: Icons.Service,
      items: [
        { id: 'expenseCategories', label: 'Категорії витрат' },
        { id: 'access', label: 'Доступи' },
        { id: 'venues', label: 'Заклади' },
        { id: 'settings', label: 'Налаштування' },
      ],
    },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarTitle}>
        <span style={{ background: '#3182ce', color: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '0.9em' }}>G</span>
        Giraffe
      </div>
      <nav className={styles.nav} aria-label="Навігація по бухгалтерії">
        {accordionSections.map((section) => (
          <div key={section.id} className={styles.accordionSection}>
            <button
              type="button"
              className={styles.accordionHeader}
              onClick={() => toggleSection(section.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#718096' }}>{section.icon}</span>
                <span className={styles.accordionLabel}>{section.label}</span>
              </div>
              <span className={`${styles.accordionIcon} ${expandedSections.has(section.id) ? styles.expanded : ''}`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </span>
            </button>
            {expandedSections.has(section.id) && (
              <div className={styles.accordionContent}>
                {section.items.map((item) => (
                  <Link
                    key={item.id}
                    href={getLink(item.id)}
                    className={`${styles.navItem} ${isActive(item.id) ? styles.navItemActive : ''}`}
                  >
                    <span className={styles.navItemLabel}>{item.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
