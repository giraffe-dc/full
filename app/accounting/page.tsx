"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
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
import { AccountsSection } from '../../components/accounting/AccountsSection';
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
import { StockInventory } from '../../components/accounting/stock/StockInventory';

import type { Transaction, Totals, CashShift, SalaryRow, MoneyAccount } from "../../types/accounting";
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
  calculatePaymentMethodStats,
  calculateIncomeCategoryStats,
  calculateExpenseCategoryStats,
  calculateDailyStats,
  calculateMaxDailyValue,
  calculateTotals,
} from "../../lib/accounting-utils";
import { MarketingSection } from "@/components/accounting/MarketingSection";
import { FinanceSettings } from "@/components/accounting/FinanceSettings";
import { Preloader } from '@/components/ui/Preloader';
import { useToast } from "@/components/ui/ToastContext";

import { useSearchParams } from "next/navigation";
import { TransactionModal } from "@/components/accounting/TransactionModal";


function AccountingContent() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const activeSection = (searchParams.get("section") as AccountingSection) || "dashboard";

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
    moneyAccountId: "",
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
    const incomeCategoryStatsRaw = calculateIncomeCategoryStats(tx);
    const expenseCategoryStatsRaw = calculateExpenseCategoryStats(tx);

    // Payment Method Stats
    const paymentMethodStatsRaw = calculatePaymentMethodStats(tx);
    const paymentMethodStats = Object.entries(paymentMethodStatsRaw)
      .filter(([_, val]) => val > 0)
      .map(([key, val]) => {
        const LABELS: Record<string, string> = {
          cash: "Готівка",
          card: "Картка",
          mixed: "Змішана",
          other: "Інше"
        };
        return {
          key,
          label: LABELS[key] || key,
          total: val,
          percent: incomeStats.totalIncomeAmount ? (val / incomeStats.totalIncomeAmount) * 100 : 0
        };
      })
      .sort((a, b) => b.total - a.total);

    const dailyStats = calculateDailyStats(tx);
    const maxDailyValue = calculateMaxDailyValue(dailyStats);

    return {
      ...incomeStats,
      incomeCategoryStats: Object.entries(incomeCategoryStatsRaw)
        .map(([key, total]) => ({
          key,
          label: categoryLabels[key] || key,
          total,
          percent: incomeStats.totalIncomeAmount ? (total / incomeStats.totalIncomeAmount) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total),
      expenseCategoryStats: Object.entries(expenseCategoryStatsRaw)
        .map(([key, total]) => ({
          key,
          label: categoryLabels[key] || key,
          total,
          percent: Object.values(expenseCategoryStatsRaw).reduce((s, v) => s + v, 0)
            ? (total / Object.values(expenseCategoryStatsRaw).reduce((s, v) => s + v, 0)) * 100
            : 0,
        }))
        .sort((a, b) => b.total - a.total),
      paymentMethodStats,
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

    // Dashboard: Sales + Manual + CashTx
    if (activeSection === 'dashboard') {
      params.append("includeReceipts", "true");
      params.append("includeCashTx", "true");
    }

    // Revenue: Manual + CashTx (NO Sales Receipts as requested)
    if (activeSection === 'revenue') {
      params.append("includeCashTx", "true");
    }

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

  // Money Accounts Data
  const [accountsData, setAccountsData] = useState<any[]>([]);

  async function fetchAccounts() {
    try {
      const res = await fetch('/api/accounting/accounts');
      const data = await res.json();
      if (data.data) {
        setAccountsData(data.data);
      }
    } catch (e) { console.error(e); }
  }

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetchData = async () => {
      await Promise.all([
        fetchTx(),
        fetchAccounts(),
        activeSection === 'clients' ? fetchClients() : Promise.resolve(),
        activeSection === 'staff' ? fetchStaff() : Promise.resolve(),
        activeSection === 'products' ? fetchProductsStats() : Promise.resolve(),
        activeSection === 'receipts' ? fetchReceipts() : Promise.resolve(),
        activeSection === 'cashShifts' ? fetchCashShifts() : Promise.resolve(),
      ]);
      setLoading(false);
    };
    fetchData();
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
      moneyAccountId: "",
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
      moneyAccountId: t.moneyAccountId || "",
    });
    setShowForm(true);
  }

  // State for cash shift transactions
  const [currentShiftId, setCurrentShiftId] = useState<string | null>(null);

  // ... (existing handlers)

  function handleAddShiftTransaction(shiftId: string) {
    setCurrentShiftId(shiftId);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      description: "",
      amount: "",
      type: "expense", // Default to expense for shifts usually? or income
      category: "other",
      paymentMethod: "cash",
      source: "cash-register", // Mark as cash register
      visits: "",
      moneyAccountId: "",
    });
    setEditingTx(null);
    setShowForm(true);
  }

  function handleEditShiftTransaction(t: any, shiftId: string) {
    setCurrentShiftId(shiftId);
    setEditingTx(t);
    setFormData({
      date: new Date(t.createdAt || new Date()).toISOString().split("T")[0],
      description: t.comment || "",
      amount: String(Math.abs(t.amount)), // Amount is stored as number, maybe negative for expense
      type: (t.type === 'Прихід' || t.type === 'Відкриття зміни' || t.type === 'Закриття зміни' || t.amount >= 0) ? 'income' : 'expense', // Infer type from display or amount
      category: t.category || "other",
      paymentMethod: "cash",
      source: "cash-register",
      visits: "",
      moneyAccountId: "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Check if we are in cash shift mode
    if (activeSection === 'cashShifts' && currentShiftId) {
      console.log(editingTx);
      const url = editingTx ? `/api/cash-register/transactions?id=${editingTx.id}` : `/api/cash-register/transactions`; // PUT needs id, POST doesn't. 
      // My API uses PUT /api/accounting/transactions for update (with body.id) and POST for create.

      const method = editingTx ? "PUT" : "POST";
      const body = {
        id: editingTx ? editingTx.id : undefined,
        shiftId: currentShiftId,
        type: formData.type,
        category: formData.category,
        amount: formData.amount,
        comment: formData.description,
        // author?
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editingTx ? 'Транзакцію оновлено!' : 'Транзакцію додано!');
        fetchCashShifts(); // Refresh shifts
        setShowForm(false);
        setEditingTx(null);
        setCurrentShiftId(null);
      } else {
        toast.error("Помилка збереження");
      }
      return;
    }

    // Default Accounting Transactions Logic
    const url = editingTx ? `/api/accounting/transactions/${editingTx._id}` : "/api/accounting/transactions";
    const method = editingTx ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      toast.success(editingTx ? 'Транзакцію оновлено!' : 'Транзакцію додано!');
      fetchTx();
      resetForm();
    } else {
      toast.error("Помилка збереження");
    }
  }

  // ... (handleDelete need update too?)

  async function handleDelete(id: string) {
    if (!confirm("Видалити транзакцію?")) return;

    if (activeSection === 'cashShifts') {
      const res = await fetch(`/api/cash-register/transactions?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Транзакцію видалено");
        fetchCashShifts();
      } else {
        toast.error("Помилка видалення");
      }
      return;
    }

    const res = await fetch(`/api/accounting/transactions/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Транзакцію видалено");
      fetchTx();
    } else {
      toast.error("Помилка видалення");
    }
  }
  // ...


  function handleOpenNewForm() {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      description: "",
      amount: "",
      type: "income",
      category: "other",
      paymentMethod: "cash",
      source: "onsite",
      visits: "",
      moneyAccountId: "",
    });
    setEditingTx(null);
    setShowForm(true);
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
                                  ? "Налаштування фінансових параметрів."
                                  : "";

  if (loading) {
    return <Preloader message="Отримуємо дані бухгалтерії..." />;
  }

  return (
    <div className={styles.container}>
      {/* Sidebar is now in layout */}

      <div className={styles.main}>
        {/* <h1 className={styles.pageTitle}>{sectionTitle}</h1>
        <p className={styles.lead}>{sectionDescription}</p> */}

        {activeSection === "settings" && (
          <FinanceSettings />
        )}


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
            paymentMethodStats={dashboardStats.paymentMethodStats}
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
            onOpenForm={handleOpenNewForm}
            form={formData}
            onFormChange={setFormData}
            onSubmit={handleSubmit}
            tx={tx}
            onEdit={handleEdit}
            onDelete={handleDelete}
            accounts={accountsData}
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
          <CashShiftsSection
            rows={cashShifts}
            onAddShift={handleAddShift}
            onCloseShift={handleCloseShift}
            onOpenShift={handleOpenShift}
            onViewShift={handleViewShift}
            onAddTransaction={handleAddShiftTransaction}
            onEditTransaction={handleEditShiftTransaction}
          />
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
          <AccountsSection
            rows={accountsData}
            onRefresh={fetchAccounts}
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
          <StockInventory />
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

        {/* Global Transaction Modal */}
        <TransactionModal
          showForm={showForm}
          onCloseForm={() => setShowForm(false)}
          form={formData}
          onFormChange={setFormData}
          onSubmit={handleSubmit}
          categories={categories}
          categoryLabels={categoryLabels}
          accounts={accountsData}
        />
      </div>
    </div>
  );
}

export default function AccountingPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px' }}>Завантаження...</div>}>
      <AccountingContent />
    </Suspense>
  );
}

