"use client";

import { useEffect, useState, useMemo } from "react";
import styles from "./page.module.css";
import { AccountingSidebar, type AccountingSection } from "../../components/accounting/Sidebar";
import { ClientsSection } from "../../components/accounting/ClientsSection";
import { DashboardSection } from "../../components/accounting/DashboardSection";
import { ReceiptsSection } from "../../components/accounting/ReceiptsSection";
import { TransactionsSection } from "../../components/accounting/TransactionsSection";
import { StaffSection } from "../../components/accounting/StaffSection";
import { CategoriesSection } from "../../components/accounting/CategoriesSection";
import { ProductsSection } from "../../components/accounting/ProductsSection";
import { PaymentsSection } from "../../components/accounting/PaymentsSection";
import { CashShiftsSection } from '../../components/accounting/CashShiftsSection';
import { SalarySection } from '../../components/accounting/SalarySection';
import { InvoicesSection } from '../../components/accounting/InvoicesSection';
import { StockSection } from '../../components/accounting/StockSection';
import { MenuProductsSection } from '../../components/accounting/MenuProductsSection';
import { MenuRecipesSection } from '../../components/accounting/MenuRecipesSection';
import { MenuIngredientsSection } from '../../components/accounting/MenuIngredientsSection';
import { MenuProductCategoriesSection } from '../../components/accounting/MenuProductCategoriesSection';
import { StockWarehouses } from '../../components/accounting/stock/StockWarehouses';
import { StockSuppliers } from '../../components/accounting/stock/StockSuppliers';
import { StockBalances } from '../../components/accounting/stock/StockBalances';
import { StockSupply } from '../../components/accounting/stock/StockSupply';
import { StockMovements } from '../../components/accounting/stock/StockMovements';
import { StockWriteOff } from '../../components/accounting/stock/StockWriteOff';

import type { Transaction, Totals, CashShift, SalaryRow } from "../../types/accounting";
import {
  CATEGORY_LABELS,
  CATEGORIES,
  MOCK_CLIENT_ROWS,
  MOCK_STAFF_ROWS,
  MOCK_CATEGORY_ROWS,
  MOCK_PRODUCT_ROWS,
  MOCK_PAYMENT_ROWS,
  MOCK_RECEIPT_ROWS,
  MOCK_CASH_SHIFTS,
  MOCK_SALARY_ROWS,
  MOCK_INVOICE_ROWS,
  MOCK_MENU_PRODUCTS,
  MOCK_PRODUCT_CATEGORIES,
} from "../../lib/accounting-mock-data";
import {
  calculateClientsTotals,
  calculateStaffTotals,
  calculateCategoryTotals,
  calculateProductTotals,
  calculatePaymentTotals,
  calculateIncomeStats,
  calculateIncomeCategoryStats,
  calculateExpenseCategoryStats,
  calculateDailyStats,
  calculateMaxDailyValue,
  calculateTotals,
} from "../../lib/accounting-utils";
import { MarketingSection } from "@/components/accounting/MarketingSection";

export default function AccountingPage() {
  const [activeSection, setActiveSection] = useState<AccountingSection>("dashboard");
  const [tx, setTx] = useState<Transaction[]>([]);
  const [totals, setTotals] = useState<Totals>({ income: 0, expense: 0, balance: 0 });
  const [showForm, setShowForm] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    type: "",
    category: "",
    paymentMethod: "",
    source: "",
  });
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: "",
    type: "income",
    category: "other",
    paymentMethod: "cash",
    source: "onsite",
    visits: "",
  });

  // Detailed mock shifts matching new UI
  // Detailed mock shifts matching new UI
  const [cashShifts, setCashShifts] = useState<any[]>([]);

  async function fetchCashShifts() {
    try {
      const res = await fetch('/api/cash-register/shifts');
      const data = await res.json();
      if (data.data) {
        setCashShifts(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  }
  const [salaryRows, setSalaryRows] = useState<SalaryRow[]>(MOCK_SALARY_ROWS);

  // Мок-дані для розділів
  const clientRows = MOCK_CLIENT_ROWS;
  const clientsTotals = useMemo(() => calculateClientsTotals(clientRows), []);

  const staffRows = MOCK_STAFF_ROWS;
  const staffTotals = useMemo(() => calculateStaffTotals(staffRows), []);

  const categoryRows = MOCK_CATEGORY_ROWS;
  const categoryTotals = useMemo(() => calculateCategoryTotals(categoryRows), []);

  const productRows = MOCK_PRODUCT_ROWS;
  const productTotals = useMemo(() => calculateProductTotals(productRows), []);

  const paymentRows = MOCK_PAYMENT_ROWS;
  const paymentTotals = useMemo(() => calculatePaymentTotals(paymentRows), []);

  const receiptRows = MOCK_RECEIPT_ROWS;
  const invoiceRows = MOCK_INVOICE_ROWS;


  // Використовуємо константи замість дублювання
  const categories = CATEGORIES;
  const categoryLabels = CATEGORY_LABELS;

  // Агрегати для дашборда на основі поточних транзакцій (з мемоізацією)
  const dashboardStats = useMemo(() => {
    const incomeStats = calculateIncomeStats(tx);
    const incomeCategoryStats = calculateIncomeCategoryStats(tx);
    const expenseCategoryStats = calculateExpenseCategoryStats(tx);
    const dailyStats = calculateDailyStats(tx);
    const maxDailyValue = calculateMaxDailyValue(dailyStats);

    return {
      ...incomeStats,
      incomeCategoryStats: Object.entries(incomeCategoryStats)
        .map(([key, total]) => ({
          key,
          label: categoryLabels[key] || key,
          total,
          percent: incomeStats.totalIncomeAmount ? (total / incomeStats.totalIncomeAmount) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total),
      expenseCategoryStats: Object.entries(expenseCategoryStats)
        .map(([key, total]) => ({
          key,
          label: categoryLabels[key] || key,
          total,
          percent: Object.values(expenseCategoryStats).reduce((s, v) => s + v, 0)
            ? (total / Object.values(expenseCategoryStats).reduce((s, v) => s + v, 0)) * 100
            : 0,
        }))
        .sort((a, b) => b.total - a.total),
      dailyStats,
      maxDailyValue,
    };
  }, [tx, categoryLabels]);

  async function fetchTx() {
    const params = new URLSearchParams();
    if (filters.startDate) params.append("startDate", filters.startDate);
    if (filters.endDate) params.append("endDate", filters.endDate);
    if (filters.type) params.append("type", filters.type);
    if (filters.category) params.append("category", filters.category);
    if (filters.paymentMethod) params.append("paymentMethod", filters.paymentMethod);
    if (filters.source) params.append("source", filters.source);
    const res = await fetch(`/api/accounting/transactions?${params.toString()}`);
    const data = await res.json();
    setTx(data.data || []);
    setTotals(data.totals || { income: 0, expense: 0, balance: 0 });
  }

  // Clients Data
  const [clientsData, setClientsData] = useState<{ rows: any[], totals: any }>({ rows: [], totals: { noDiscount: 0, cash: 0, card: 0, profit: 0, receipts: 0 } });

  async function fetchClients() {
    try {
      const res = await fetch('/api/accounting/clients');
      const data = await res.json();
      if (data.data) {
        setClientsData({ rows: data.data, totals: data.totals });
      }
    } catch (e) { console.error(e); }
  }

  // Staff Data
  const [staffData, setStaffData] = useState<{ rows: any[], totals: any }>({ rows: [], totals: { revenue: 0, profit: 0, receipts: 0 } });

  async function fetchStaff() {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const res = await fetch(`/api/accounting/staff?${params.toString()}`);
      const data = await res.json();
      if (data.data) {
        setStaffData({ rows: data.data, totals: data.totals });
      }
    } catch (e) { console.error(e); }
  }

  // Products Stats Data
  const [productsStats, setProductsStats] = useState<{ rows: any[], totals: any }>({ rows: [], totals: { count: 0, grossRevenue: 0, discount: 0, revenue: 0, profit: 0 } });

  async function fetchProductsStats() {
    try {
      const res = await fetch('/api/accounting/products/stats');
      const data = await res.json();
      if (data.data) {
        setProductsStats({ rows: data.data, totals: data.totals });
      }
    } catch (e) { console.error(e); }
  }

  // Receipts Data
  const [receiptsData, setReceiptsData] = useState<any[]>([]);

  async function fetchReceipts() {
    try {
      const res = await fetch('/api/accounting/receipts');
      const data = await res.json();
      if (data.data) {
        setReceiptsData(data.data);
      }
    } catch (e) { console.error(e); }
  }

  useEffect(() => {
    fetchTx();
    if (activeSection === 'clients') fetchClients();
    if (activeSection === 'staff') fetchStaff();
    if (activeSection === 'products') fetchProductsStats();
    if (activeSection === 'receipts') fetchReceipts();
    if (activeSection === 'cashShifts') fetchCashShifts();
  }, [filters, activeSection]);

  function resetForm() {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      description: "",
      amount: "",
      type: "income",
      category: "other",
      paymentMethod: "cash",
      source: "onsite",
      visits: "",
    });
    setEditingTx(null);
    setShowForm(false);
  }

  function handleEdit(t: Transaction) {
    setEditingTx(t);
    setFormData({
      date: new Date(t.date).toISOString().split("T")[0],
      description: t.description,
      amount: String(t.amount),
      type: t.type,
      category: t.category || "other",
      paymentMethod: t.paymentMethod || "cash",
      source: t.source || "onsite",
      visits: t.visits !== undefined ? String(t.visits) : "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = editingTx ? `/api/accounting/transactions/${editingTx._id}` : "/api/accounting/transactions";
    const method = editingTx ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      fetchTx();
      resetForm();
    } else {
      alert("Помилка збереження");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Видалити транзакцію?")) return;
    const res = await fetch(`/api/accounting/transactions/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchTx();
    } else {
      alert("Помилка видалення");
    }
  }

  const handleAddShift = () => {
    console.log('Додати нову касову зміну');
    // Тут буде логіка додавання нової касової зміни
  };
  const handleCloseShift = (id: string) => {
    console.log('Закрити касову зміну', id);
    setCashShifts(prev =>
      prev.map(shift =>
        shift.id === id ? { ...shift, status: 'closed' } : shift
      )
    );
  };
  const handleOpenShift = (id: string) => {
    console.log('Відкрити касову зміну', id);
    setCashShifts(prev =>
      prev.map(shift =>
        shift.id === id ? { ...shift, status: 'opened' } : shift
      )
    );
  };
  const handleViewShift = (id: string) => {
    console.log('Переглянути касову зміну', id);
    // Тут буде логіка перегляду деталей касової зміни
  };

  const handlePaySalary = (id: string) => {
    console.log('Виплата зарплати для', id);
    // Тут буде логіка виплати зарплати
  };

  const handleViewSalaryDetails = (id: string) => {
    console.log('Перегляд деталей зарплати для', id);
    // Тут буде логіка перегляду деталей
  };

  const handleExportSalary = () => {
    console.log('Експорт даних про зарплату');
    // Тут буде логіка експорту
  };

  const sectionTitle =
    activeSection === "dashboard"
      ? "Дашборд"
      : activeSection === "clients"
        ? "Клієнти"
        : activeSection === "staff"
          ? "Працівники"
          : activeSection === "categories"
            ? "Категорії"
            : activeSection === "products"
              ? "Товари"
              : activeSection === "receipts"
                ? "Чеки"
                : activeSection === "revenue"
                  ? "Виручка"
                  : activeSection === "payments"
                    ? "Оплати"
                    : activeSection === "taxes"
                      ? "Податки"
                      : activeSection === "menu"
                        ? "Меню"
                        : activeSection === "stock"
                          ? "Склад"
                          : activeSection === "marketing"
                            ? "Маркетинг"
                            : activeSection === "access"
                              ? "Доступи"
                              : activeSection === "venues"
                                ? "Усі заклади"
                                : activeSection === "settings"
                                  ? "Налаштування"
                                  : "";

  const sectionDescription =
    activeSection === "dashboard"
      ? "Загальний огляд доходів, витрат та балансу."
      : activeSection === "clients"
        ? "Робота з клієнтами та історією їхніх відвідувань."
        : activeSection === "staff"
          ? "Показники роботи працівників та офіціантів."
          : activeSection === "categories"
            ? "Категорії товарів і послуг за виторгом та собівартістю."
            : activeSection === "products"
              ? "Номенклатура товарів та послуг. (планується)"
              : activeSection === "receipts"
                ? "Облік чеків та операцій за розрахунковими документами."
                : activeSection === "revenue"
                  ? "Розрізи по виручці центру. (планується)"
                  : activeSection === "payments"
                    ? "Розрахунки та оплати. (планується)"
                    : activeSection === "taxes"
                      ? "Податкові нарахування та звітність. (планується)"
                      : activeSection === "menu"
                        ? "Меню кафе та додаткових послуг. (планується)"
                        : activeSection === "stock"
                          ? "Складські залишки та рух товарів. (планується)"
                          : activeSection === "marketing"
                            ? "Акції, промокоди та рекламні активності. (планується)"
                            : activeSection === "access"
                              ? "Права доступу бухгалтерів та менеджерів. (планується)"
                              : activeSection === "venues"
                                ? "Мережа закладів та їхні показники. (планується)"
                                : activeSection === "settings"
                                  ? "Налаштування фінансових параметрів. (планується)"
                                  : "";

  return (
    <div className={styles.container}>
      <AccountingSidebar activeSection={activeSection} onChange={setActiveSection} />

      <div className={styles.main}>
        <h1 className={styles.pageTitle}>{sectionTitle}</h1>
        <p className={styles.lead}>{sectionDescription}</p>


        {activeSection === "dashboard" && (
          <DashboardSection
            totals={totals}
            totalIncomeAmount={dashboardStats.totalIncomeAmount}
            averageCheck={dashboardStats.averageCheck}
            totalVisits={dashboardStats.totalVisits}
            incomeTxCount={dashboardStats.incomeTx.length}
            operationCount={tx.length}
            incomeCategoryStats={dashboardStats.incomeCategoryStats}
            expenseCategoryStats={dashboardStats.expenseCategoryStats}
            dailyStats={dashboardStats.dailyStats}
            maxDailyValue={dashboardStats.maxDailyValue}
            filters={filters}
            onFilterChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))}
            onResetFilters={() => setFilters(prev => ({ ...prev, startDate: "", endDate: "" }))}
          />
        )}


        {activeSection === "receipts" && (
          <ReceiptsSection rows={receiptsData} />
        )}

        {activeSection === "revenue" && (
          <TransactionsSection
            active={true}
            filters={filters}
            onFiltersChange={setFilters}
            categories={categories}
            categoryLabels={categoryLabels}
            showForm={showForm}
            onCloseForm={() => setShowForm(false)}
            onOpenForm={() => setShowForm(true)}
            form={formData}
            onFormChange={setFormData}
            onSubmit={handleSubmit}
            tx={tx}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}

        {activeSection === "clients" && (
          <ClientsSection rows={clientsData.rows} totals={clientsData.totals} />
        )}

        {activeSection === "staff" && (
          <StaffSection
            rows={staffData?.rows}
            totals={staffData?.totals}
            filters={filters}
            onFilterChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))}
          />
        )}

        {activeSection === "categories" && (
          <CategoriesSection rows={categoryRows} totals={categoryTotals} />
        )}

        {activeSection === "products" && (
          <ProductsSection rows={productsStats.rows} totals={productsStats.totals} />
        )}

        {activeSection === "payments" && (
          <PaymentsSection rows={paymentRows} totals={paymentTotals} />
        )}

        {activeSection === "cashShifts" && (
          <CashShiftsSection rows={cashShifts} onAddShift={handleAddShift} onCloseShift={handleCloseShift} onOpenShift={handleOpenShift} onViewShift={handleViewShift} />
        )}

        {activeSection === "salary" && (
          <SalarySection
            rows={salaryRows}
            onPay={handlePaySalary}
            onView={handleViewSalaryDetails}
            onExport={handleExportSalary}
          />
        )}

        {activeSection === "accounts" && (
          <InvoicesSection
            rows={invoiceRows}
            onAddInvoice={() => console.log('Add invoice')}
            onEditInvoice={(id) => console.log('Edit invoice', id)}
            onDeleteInvoice={(id) => console.log('Delete invoice', id)}
          />
        )}

        {activeSection === "stockBalances" && (
          <StockBalances />
        )}

        {activeSection === "stockSupply" && (
          <StockSupply />
        )}

        {activeSection === "stockMovement" && (
          <StockMovements />
        )}

        {activeSection === "stockWriteOff" && (
          <StockWriteOff />
        )}


        {activeSection === "stockReport" && (
          <StockSection title="Звіт за рухом" subtitle="Аналіз руху товарів за період" />
        )}

        {activeSection === "stockInventory" && (
          <StockSection title="Інвентаризації" subtitle="Перевірка залишків товарів" />
        )}

        {activeSection === "stockSuppliers" && (
          <StockSuppliers />
        )}

        {activeSection === "stockWarehouses" && (
          <StockWarehouses />
        )}

        {activeSection === "stockPacking" && (
          <StockSection title="Фасування" subtitle="Упакування товарів" />
        )}

        {activeSection === "marketing" && (
          <MarketingSection />
        )}

        {activeSection === "menuProducts" && (
          <MenuProductsSection />
        )}

        {activeSection === "menuRecipes" && (
          <MenuRecipesSection />
        )}

        {activeSection === "menuIngredients" && (
          <MenuIngredientsSection />
        )}

        {activeSection === "menuProductCategories" && (
          <MenuProductCategoriesSection />
        )}

        {activeSection === "menuIngredientCategories" && (
          <StockSection title="Категорії інгредієнтів" subtitle="Організація інгредієнтів" />
        )}


      </div>
    </div>
  );
}

