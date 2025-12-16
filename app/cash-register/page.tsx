"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import styles from "./page_v2.module.css";
import { CashRegisterState, Service, CartItem, Receipt, Department, Table, Check } from "../../types/cash-register";
import { Modal } from "../../components/ui";
import { DepartmentSelector } from "../../components/cash-register/DepartmentSelector";
import { TableSelector } from "../../components/cash-register/TableSelector";
import { CashRegisterNav } from '@/components/cash-register/CashRegisterNav';
import { StaffSchedulerModal } from '@/components/cash-register/StaffSchedulerModal';
import { WaiterSelectorModal } from '@/components/cash-register/WaiterSelectorModal';
import { CheckView } from "@/components/cash-register/CheckView";
import { ApplyPromotionModal } from "../../components/cash-register/ApplyPromotionModal";

type ViewState = 'departments' | 'tables' | 'check';

export default function CashRegisterPage() {
  // --- Global Data ---
  const [products, setProducts] = useState<Service[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [tables, setTables] = useState<Table[]>([]);

  // --- Navigation State ---
  const [view, setView] = useState<ViewState>('departments');
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [activeCheck, setActiveCheck] = useState<Check | null>(null);
  const [orders, setOrders] = useState<Check[]>([]); // All open checks/orders

  // Staff Logic
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [activeStaffIds, setActiveStaffIds] = useState<string[]>([]);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showWaiterModal, setShowWaiterModal] = useState(false);
  const [pendingTableForCheck, setPendingTableForCheck] = useState<Table | null>(null);

  // --- UI State ---
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<Receipt | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mixed'>('cash');
  const [amountGiven, setAmountGiven] = useState("");
  const [guestCountInput, setGuestCountInput] = useState("1");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [pendingTable, setPendingTable] = useState<Table | null>(null);

  // --- Shift State ---
  const [currentShift, setCurrentShift] = useState<any | null>(null);
  const [shiftStartBalance, setShiftStartBalance] = useState("");

  // --- Promotions State ---
  const [showPromotionsModal, setShowPromotionsModal] = useState(false);

  // --- Initial Load ---
  useEffect(() => {
    fetchInitialData();

  }, []);

  useEffect(() => {
    if (view === 'tables') {
      fetchChecks();
    }
  }, [view]);

  const fetchChecks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/cash-register/checks?status=open');
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
      }
    } catch (e) {
      console.error("Failed to fetch checks", e);
    } finally {
      setIsLoading(false);
    }
  }

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, deptRes, shiftRes, staffRes, checksRes] = await Promise.all([
        fetch('/api/accounting/products?status=active'),
        fetch('/api/cash-register/departments'),
        fetch('/api/cash-register/shifts?status=open'),
        fetch('/api/staff'),
        fetch('/api/cash-register/checks?status=open')
      ]);

      const prodData = await prodRes.json();
      const deptData = await deptRes.json();
      const shiftData = await shiftRes.json();
      const staffData = await staffRes.json();
      const checksData = await checksRes.json();

      if (prodData.success) {
        const services: Service[] = prodData.data.map((p: any) => ({
          id: p._id,
          name: p.name,
          category: p.category,
          price: p.sellingPrice,
          code: p.code,
          imageUrl: p.imageUrl
        }));
        // Deduplicate
        const uniqueServices = Array.from(new Map(services.map(s => [s.id, s])).values());
        setProducts(uniqueServices);
      }

      if (deptData.success) {
        setDepartments(deptData.data);
      }

      if (shiftData.success && shiftData.data.length > 0) {
        const shift = shiftData.data[0];
        setCurrentShift(shift);
        if (shift.activeStaffIds) {
          setActiveStaffIds(shift.activeStaffIds);
        }
      }

      // console.log("staffData", staffData);

      if (staffData) {
        const mappedStaff = staffData.data.map((s: any) => ({
          ...s,
          id: s._id
        }));
        // console.log("mappedStaff", mappedStaff);
        setAllStaff(mappedStaff);
      }

      if (checksData.success) {
        setOrders(checksData.data);
      }

    } catch (e) {
      console.error("Failed to fetch data", e);
    } finally {
      setIsLoading(false);
    }
  }
  const handleUpdateShiftStaff = async (ids: string[]) => {
    if (!currentShift) return;
    try {
      await fetch('/api/cash-register/shifts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentShift.id, activeStaffIds: ids })
      });
      setActiveStaffIds(ids);
      setShowStaffModal(false);
    } catch (e) {
      alert("Error updating shift staff");
    }
  };
  const activeStaffList = allStaff.filter(s => activeStaffIds.includes(s.id));

  // Debug logs removed

  // --- Navigation Handlers ---

  const handleSelectDepartment = async (dept: Department) => {
    setSelectedDepartment(dept);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/cash-register/tables?departmentId=${dept.id}`);
      const data = await res.json();
      if (data.success) {
        setTables(data.data);
        setView('tables');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDepartment = async () => {
    const name = prompt("Введіть назву нового залу:");
    if (!name) return;

    try {
      const res = await fetch('/api/cash-register/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (data.success) {
        setDepartments([...departments, data.data]);
      } else {
        alert("Помилка: " + data.error);
      }
    } catch (e) {
      alert("Помилка при створенні залу");
    }
  };

  const handleSelectTable = async (table: Table) => {
    if (!currentShift) {
      alert("Спочатку відкрийте зміну!");
      setShowShiftModal(true);
      return;
    }

    if (table.status === 'busy') {
      // Open existing check immediately
      openCheckForTable(table);
    } else {
      // Prompt for guests for new check
      setPendingTable(table);
      setGuestCountInput("1");
      setShowGuestModal(true);
    }
  };

  const handleAddTable = async () => {
    if (!selectedDepartment) return;

    const name = prompt("Введіть назву/номер нового столу:");
    if (!name) return;

    try {
      const res = await fetch('/api/cash-register/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, departmentId: selectedDepartment.id })
      });
      const data = await res.json();
      if (data.success) {
        setTables([...tables, data.data]);
      } else {
        alert("Помилка: " + data.error);
      }
    } catch (e) {
      alert("Помилка при створенні столу");
    }
  };

  const handleConfirmGuestCount = () => {
    if (pendingTable) {
      openCheckForTable(pendingTable, Number(guestCountInput) || 1);
      setShowGuestModal(false);
      setPendingTable(null);
    }
  };

  const openCheckForTable = async (table: Table, guestsCount: number = 0, waiter?: { id: string, name: string }) => {
    setSelectedTable(table);
    setIsLoading(true);

    // 1. Check if there is an existing open check for this table
    const existingCheck = orders.find(o => o.tableId === table.id && o.status === 'open');
    if (existingCheck) {
      setActiveCheck(existingCheck);
      setView('check');
      setIsLoading(false);
      return;
    }

    let waiterName = waiter?.name;
    let waiterId = waiter?.id;

    // Fallback if not provided (should not happen if we enforce selection)
    if (!waiterName && activeStaffList.length === 1) {
      waiterName = activeStaffList[0].name;
      waiterId = activeStaffList[0].id;
    }

    if (table.status === 'free' && !waiterName && activeStaffIds.length > 0) {
      // This case should be handled by UI interceptor (handleTableClick),
      // but as a safety check, if we somehow get here without a waiter for a free table,
      // we should prevent check creation.
      alert("Будь ласка, виберіть офіціанта.");
      setIsLoading(false);
      return;
    }

    try {
      // Create or get existing check
      const res = await fetch('/api/cash-register/checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: table.id,
          tableName: table.name,
          departmentId: selectedDepartment?.id,
          shiftId: currentShift.id,
          guestsCount: guestsCount,
          waiterId,
          waiterName
        })
      });
      const data = await res.json();

      if (data.success) {
        setActiveCheck(data.data);
        setView('check');
        // Update table status locally
        const updatedTables = tables.map(t => t.id === table.id ? { ...t, status: 'busy' as const } : t);
        setTables(updatedTables);
        // Add to orders list
        setOrders([...orders, data.data]);
      }
    } catch (e) {
      console.error(e);
      alert("Помилка при відкритті столу");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTableClick = (table: Table) => {
    if (!currentShift) {
      alert("Спочатку відкрийте зміну!");
      setShowShiftModal(true);
      return;
    }

    if (table.status === 'busy') {
      // Go straight to check
      openCheckForTable(table);
    } else {

      // Free table
      if (activeStaffList.length === 0) {
        alert("Нікого немає на зміні! Додайте співробітників.");
        setShowStaffModal(true);
        return;
      }
      if (activeStaffList.length === 1) {
        // Auto select the only waiter
        setPendingTable(table); // Set pending table for guest count modal
        setGuestCountInput("1");
        setShowGuestModal(true);
        // The actual openCheckForTable will be called from handleConfirmGuestCount
        // with the auto-selected waiter.
      } else {
        // Multiple waiters, show modal
        setPendingTableForCheck(table);
        setShowWaiterModal(true);
      }
    }
  };

  const handleBackToDepartments = () => {
    setSelectedDepartment(null);
    setView('departments');
  };

  const handleBackToTables = () => {
    // Check is auto-saved, just navigate back
    setActiveCheck(null);
    setSelectedTable(null);
    // Refresh tables to show status updates
    if (selectedDepartment) {
      handleSelectDepartment(selectedDepartment);
    }
    setView('tables');
  };

  // --- Cart/Check Management ---

  // Auto-save check whenever activeCheck changes
  // Debouncing would be good here, but for simplicity we'll trigger save on specific actions
  const saveCheck = async (check: Check) => {
    try {
      console.log("Saving check", check);
      await fetch(`/api/cash-register/checks/${check.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: check.items,
          subtotal: check.subtotal,
          tax: check.tax,
          total: check.total,
          customerId: check.customerId,
          customerName: check.customerName,
          comment: check.comment,
          discount: check.discount,
          appliedPromotionId: check.appliedPromotionId
        })
      });
    } catch (e) {
      console.error("Failed to save check", e);
    }
  };

  const updateCheckState = (newCheck: Check) => {
    setActiveCheck(newCheck);
    saveCheck(newCheck);
  };

  // --- Handlers (Shift & Payment) ---

  const handlePrepareOpenShift = async () => {
    setIsLoading(true);
    try {
      // Fetch last closed shift to get its end balance
      const res = await fetch('/api/cash-register/shifts?status=closed&limit=1', { cache: 'no-store' });
      const data = await res.json();

      if (data.success && data.data.length > 0) {
        const lastShift = data.data[0];
        if (lastShift.endBalance) {
          setShiftStartBalance(lastShift.endBalance.toString());
        } else {
          setShiftStartBalance("");
        }
      } else {
        setShiftStartBalance("");
      }
      setShowShiftModal(true);
    } catch (e) {
      console.error("Failed to fetch last shift", e);
      setShiftStartBalance("");
      setShowShiftModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const [shiftOpenerId, setShiftOpenerId] = useState("");

  const handleOpenShift = async (balance: number, cashierId: string) => {
    if (!cashierId) {
      alert("Оберіть співробітника, що відкриває зміну");
      return;
    }
    const cashier = allStaff.find(s => s.id === cashierId);

    try {
      const res = await fetch('/api/cash-register/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startBalance: balance,
          cashierId: cashier?.id,
          cashierName: cashier?.name || 'Unknown'
        })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentShift({ ...data.data, receipts: [] });
        setActiveStaffIds([cashierId]); // Update local active staff
        setShowShiftModal(false);
      } else {
        alert("Помилка: " + data.error);
      }
    } catch (e) {
      alert("Помилка мережі");
    }
  };

  // --- Shift Closing Logic ---
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [closingShiftData, setClosingShiftData] = useState<{
    startBalance: number;
    totalSales: number;
    totalSalesCash: number;
    totalSalesCard: number;
    totalExpenses: number;
    totalIncome: number;
    totalIncasation: number;
    expectedBalance: number;
  } | null>(null);
  const [shiftEndBalance, setShiftEndBalance] = useState("");

  // --- Transactions (Income/Expense/Incasation) ---
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense' | 'incasation'>('expense');
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionCategory, setTransactionCategory] = useState("");
  const [transactionComment, setTransactionComment] = useState("");

  const handleCreateTransaction = async () => {
    if (!currentShift) return;
    if (!transactionAmount || Number(transactionAmount) <= 0) {
      alert("Введіть коректну суму");
      return;
    }

    // Auto-select author (first active staff or 'Admin')
    const authorId = activeStaffIds.length > 0 ? activeStaffIds[0] : null;
    const author = allStaff.find(s => s.id === authorId);

    try {
      const res = await fetch('/api/cash-register/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: currentShift.id,
          type: transactionType,
          category: transactionCategory,
          amount: Number(transactionAmount),
          comment: transactionComment,
          authorId: author?.id,
          authorName: author?.name || 'Admin'
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("Операцію успішно збережено");
        setShowTransactionModal(false);
        setTransactionAmount("");
        setTransactionCategory("");
        setTransactionComment("");
        // Ideally refresh current shift data here to update totals immediately?
        // currentShift is updated on load or close. Let's trigger a light refresh if possible or just rely on next action.
      } else {
        alert("Помилка: " + data.error);
      }
    } catch (e) {
      alert("Помилка мережі");
    }
  };

  const handleTransactionClick = (type: 'income' | 'expense' | 'incasation') => {
    setTransactionType(type);
    setTransactionAmount("");
    setTransactionComment("");
    setTransactionCategory(type === 'expense' ? 'Business Expenses' : '');
    setShowTransactionModal(true);
  };

  const handleInitiateCloseShift = async () => {
    console.log("Initiating close shift...", currentShift);
    if (!currentShift) {
      console.error("No current shift to close");
      return;
    }
    setIsLoading(true);
    try {
      // Fetch latest shift data to get up-to-date sales
      const res = await fetch(`/api/cash-register/shifts?status=open`, { cache: 'no-store' });
      const data = await res.json();
      console.log("Shift data fetched:", data);

      if (data.success && data.data.length > 0) {
        const shift = data.data[0];
        const start = shift.startBalance || 0;
        const salesTotal = shift.totalSales || 0;
        const salesCash = shift.totalSalesCash || 0;
        const salesCard = shift.totalSalesCard || 0;
        const expenses = shift.totalExpenses || 0;
        const income = shift.totalIncome || 0;
        const incasation = shift.totalIncasation || 0;

        // Expected Cash Balance = Start + Cash Sales + Income - Expenses - Incasation
        const expected = start + salesCash + income - expenses - incasation;

        setClosingShiftData({
          startBalance: start,
          totalSales: salesTotal,
          totalSalesCash: salesCash,
          totalSalesCard: salesCard,
          totalExpenses: expenses,
          totalIncome: income, // Add to state type
          totalIncasation: incasation, // Add to state type
          expectedBalance: expected
        });
        setShiftEndBalance(expected.toString()); // Pre-fill with expected
        setShowCloseShiftModal(true);
      } else {
        console.warn("No open shift found in API, but currentShift is set locally.");
        // Fallback to local data if API fails to find it (should not happen usually)
        // But to be safe, show modal with local start balance? 
        // Better to alert user.
        alert("Помилка: не знайдено відкриту зміну на сервері.");
      }
    } catch (e) {
      console.error("Error fetching shift data", e);
      alert("Не вдалося отримати дані зміни");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmCloseShift = async () => {
    if (!currentShift) return;

    try {
      const res = await fetch('/api/cash-register/shifts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentShift.id, endBalance: Number(shiftEndBalance) })
      });
      const data = await res.json();

      if (data.success) {
        alert("Зміна закрита успішно!");
        setCurrentShift(null);
        setShowCloseShiftModal(false);
        setView('departments');
      } else {
        alert("Помилка: " + data.error);
      }
    } catch (e) {
      alert("Помилка мережі");
    }
  };

  const handleCheckout = async () => {
    if (!currentShift || !activeCheck) return;

    // Use the existing checkout API but adapt payload
    // Or better, creating a new endpoint for closing a check
    // For MVP, we will use the existing checkout route but we also need to DELETE the open check

    // Wait, the checkout route creates a Receipt and Transaction. 
    // We should also delete the Check from 'checks' collection and update table status.

    // Let's rely on the checkout API to accept 'checkId' if we modify it, OR just call DELETE check after success.
    // For safety, let's call DELETE check separately for now or modify Check API.

    // Actually, creating a new route `api/cash-register/checks/[id]/close` would be cleaner,
    // but to save time, I will use `checkout` route and then `DELETE check`.

    const payload = {
      items: activeCheck.items,
      paymentMethod,
      total: activeCheck.total,
      subtotal: activeCheck.subtotal,
      tax: activeCheck.tax,
      customerId: activeCheck.customerId,
      shiftId: currentShift.id,
      waiterName: activeCheck.waiterName,
      waiterId: activeCheck.waiterId
    };

    try {
      // 1. Process Payment & Create Receipt
      const res = await fetch('/api/cash-register/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        // 2. Delete the open check
        await fetch(`/api/cash-register/checks?id=${activeCheck.id}`, { method: 'DELETE' });

        // 3. Navigate back and refresh
        alert("Оплата успішна!");
        handleBackToTables();
      } else {
        alert("Помилка оплати: " + (data.error || "Unknown"));
        setIsLoading(false);
      }
    } catch (e) {
      console.error(e);
      alert("Помилка мережі при оплаті");
      setIsLoading(false);
    }
  };

  const handleFinishReceipt = () => {
    setShowReceiptModal(false);
    handleBackToTables(); // Return to table selection
  };

  // --- Render Helpers ---
  // (Search logic moved to CheckView, but we keep products state here)

  // --- Views ---

  const handleApplyPromotion = (promotion: any, discountAmount: number, items?: CartItem[]) => {
    if (!activeCheck) return;

    if (!promotion) {
      // Cancel promotion: Reset discount and items (clear discount field)
      const resetItems = activeCheck.items.map(i => ({ ...i, discount: 0 }));

      updateCheckState({
        ...activeCheck,
        items: resetItems,
        discount: 0,
        appliedPromotionId: undefined,
        total: activeCheck.subtotal + activeCheck.tax // Revert to subtotal + tax
      });
    } else {
      // Apply promotion
      const checkItems = items || activeCheck.items;
      const subtotal = checkItems.reduce((sum, i) => sum + i.subtotal, 0);
      const tax = 0; // Or activeCheck.tax if logic exists
      const total = Math.max(0, subtotal + tax - discountAmount);

      updateCheckState({
        ...activeCheck,
        items: checkItems,
        subtotal,
        tax,
        discount: discountAmount,
        appliedPromotionId: promotion.id || promotion._id,
        total
      });
    }
    setShowPromotionsModal(false);
  };

  if (view === 'departments') {
    return (
      <div className={styles.container}>
        <div className={styles.mainArea}>
          <CashRegisterNav
            setShowStaffModal={setShowStaffModal}
            activeStaffIds={activeStaffIds}
            isShiftOpen={!!currentShift}
            onOpenShift={handlePrepareOpenShift}
            onCloseShift={handleInitiateCloseShift}
            onCashOperation={handleTransactionClick}
          />
          {/* Header / Top Bar */}

          <DepartmentSelector
            departments={departments}
            activeId={selectedDepartment?.id || null}
            onSelect={handleSelectDepartment}
            onAdd={handleAddDepartment}
          />
          <div style={{ marginTop: '2rem' }}>
            <button onClick={() => setView('tables')} style={{ padding: '8px 16px', background: '#ccc', border: 'none', borderRadius: '4px' }}>
              Перейти до столів
            </button>
          </div>

          {showTransactionModal && (
            <Modal
              isOpen={true}
              title={
                transactionType === 'income' ? '➕ Внесення коштів' :
                  transactionType === 'expense' ? '➖ Витрати' : '🏦 Інкасація'
              }
              onClose={() => setShowTransactionModal(false)}
            >
              <div style={{ padding: '20px' }}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#374151' }}>Сума</label>
                  <input
                    type="number"
                    value={transactionAmount}
                    onChange={(e) => setTransactionAmount(e.target.value)}
                    placeholder="0.00"
                    style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1.2rem', fontWeight: 'bold' }}
                    autoFocus
                  />
                </div>

                {transactionType === 'expense' && (
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', color: '#374151' }}>Категорія витрат</label>
                    <select
                      value={transactionCategory}
                      onChange={(e) => setTransactionCategory(e.target.value)}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                    >
                      <option value="Business Expenses">Господарські витрати</option>
                      <option value="Supplier Payment">Оплата постачальникам</option>
                      <option value="Utilities">Комунальні платежі</option>
                      <option value="Other">Інше</option>
                    </select>
                  </div>
                )}

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#374151' }}>Коментар</label>
                  <textarea
                    value={transactionComment}
                    onChange={(e) => setTransactionComment(e.target.value)}
                    placeholder={transactionType === 'expense' ? "На що витрачено..." : "Примітка..."}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', minHeight: '60px' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button onClick={() => setShowTransactionModal(false)} style={{ padding: '8px 16px', background: '#ccc', borderRadius: '4px', border: 'none' }}>Скасувати</button>
                  <button
                    onClick={handleCreateTransaction}
                    style={{
                      padding: '8px 16px',
                      background: transactionType === 'income' ? '#22c55e' : transactionType === 'expense' ? '#ef4444' : '#a855f7',
                      color: 'white',
                      borderRadius: '4px',
                      border: 'none',
                      fontWeight: 'bold'
                    }}
                  >
                    Зберегти
                  </button>
                </div>
              </div>
            </Modal>
          )}

          {showStaffModal && (
            <StaffSchedulerModal
              shiftId={currentShift?.id || null}
              activeStaffIds={activeStaffIds}
              onClose={() => setShowStaffModal(false)}
              onSave={handleUpdateShiftStaff}
              currentActiveIds={activeStaffIds}
            />
          )}

          {showShiftModal && (
            <Modal isOpen={true} title="Відкриття зміни" onClose={() => setShowShiftModal(false)}>
              <div style={{ padding: '20px' }}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#374151' }}>Хто відкриває зміну?</label>
                  <select
                    value={shiftOpenerId}
                    onChange={(e) => setShiftOpenerId(e.target.value)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                  >
                    <option value="">-- Оберіть співробітника --</option>
                    {allStaff.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>

                <p style={{ marginBottom: '5px' }}>Введіть початкову суму в касі:</p>
                <input
                  type="number"
                  value={shiftStartBalance}
                  onChange={(e) => setShiftStartBalance(e.target.value)}
                  style={{ width: '100%', padding: '8px', marginBottom: '20px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button onClick={() => setShowShiftModal(false)} style={{ padding: '8px 16px', background: '#ccc', borderRadius: '4px', border: 'none' }}>Скасувати</button>
                  <button
                    onClick={() => handleOpenShift(Number(shiftStartBalance), shiftOpenerId)}
                    style={{ padding: '8px 16px', background: '#22c55e', color: 'white', borderRadius: '4px', border: 'none' }}
                  >
                    Відкрити зміну
                  </button>
                </div>
              </div>
            </Modal>
          )}

          {showCloseShiftModal && closingShiftData && (
            <Modal isOpen={true} title="Закриття зміни" onClose={() => setShowCloseShiftModal(false)}>
              <div style={{ padding: '20px', minWidth: '350px' }}>
                <div style={{ marginBottom: '20px', background: '#f9fafb', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>Початковий залишок:</span>
                    <b>{closingShiftData.startBalance.toFixed(2)} ₴</b>
                  </div>
                  <div style={{ marginBottom: '8px', paddingLeft: '10px', borderLeft: '3px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#6b7280' }}>
                      <span>💵 Готівка:</span>
                      <span>{closingShiftData.totalSalesCash.toFixed(2)} ₴</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#6b7280' }}>
                      <span>💳 Карта:</span>
                      <span>{closingShiftData.totalSalesCard.toFixed(2)} ₴</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>Продажі (Всього):</span>
                    <b style={{ color: '#16a34a' }}>+ {closingShiftData.totalSales.toFixed(2)} ₴</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>Витрати:</span>
                    <b style={{ color: '#dc2626' }}>- {closingShiftData.totalExpenses.toFixed(2)} ₴</b>
                  </div>
                  <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                    <span>Розрахунковий залишок (Готівка):</span>
                    <b>{closingShiftData.expectedBalance.toFixed(2)} ₴</b>
                  </div>
                </div>

                <p style={{ marginBottom: '5px', fontSize: '0.9rem', color: '#6b7280' }}>Введіть фактичну суму в касі:</p>
                <input
                  type="number"
                  value={shiftEndBalance}
                  onChange={(e) => setShiftEndBalance(e.target.value)}
                  style={{ width: '100%', padding: '10px', marginBottom: '20px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1.2rem', fontWeight: 'bold' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button onClick={() => setShowCloseShiftModal(false)} style={{ padding: '8px 16px', background: '#ccc', borderRadius: '4px', border: 'none' }}>Скасувати</button>
                  <button
                    onClick={handleConfirmCloseShift}
                    style={{ padding: '8px 16px', background: '#ef4444', color: 'white', borderRadius: '4px', border: 'none', fontWeight: 'bold' }}
                  >
                    Закрити зміну
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      </div>
    );
  }


  const handleAddItem = async (item: CartItem) => {
    if (!activeCheck) return;

    // Check if item already exists
    const existingItemIndex = activeCheck.items.findIndex(i =>
      (i.productId && i.productId === item.productId) ||
      (i.serviceId === item.serviceId)
    );

    let newItems = [...activeCheck.items];
    if (existingItemIndex >= 0) {
      newItems[existingItemIndex].quantity += item.quantity;
      newItems[existingItemIndex].subtotal = newItems[existingItemIndex].quantity * newItems[existingItemIndex].price;
    } else {
      newItems.push(item);
    }

    // Recalculate totals
    const subtotal = newItems.reduce((sum, i) => sum + i.subtotal, 0);
    const tax = subtotal * 0; // Assuming 0 tax for now or implement logic
    const total = Math.max(0, subtotal + tax - (activeCheck.discount || 0));

    const updatedCheck: Check = {
      ...activeCheck,
      items: newItems,
      subtotal,
      tax,
      total,
      updatedAt: new Date().toISOString()
    };

    updateCheckState(updatedCheck);
  };

  const handleVoidCheck = async () => {
    if (!activeCheck) return;
    if (confirm("Ви впевнені, що хочете анулювати цей чек як помилковий? Це дію неможливо відмінити.")) {
      try {
        await fetch(`/api/cash-register/checks/${activeCheck.id}`, { method: 'DELETE' });

        // Update local tables status
        setTables(prev => prev.map(t =>
          t.id === activeCheck.tableId ? { ...t, status: 'free' } : t
        ));

        setActiveCheck(null);
        setView('tables');
      } catch (e) {
        console.error("Failed to void check", e);
        alert("Помилка при анулюванні чеку");
      }
    }
  };

  // Check View Wrapper
  if (view === 'check' && activeCheck) {
    return (
      <div className={styles.container}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1rem' }}>
          <div>{/* Empty or breadcrumbs */}</div>
          <button
            onClick={() => setShowPromotionsModal(true)}
            style={{
              background: 'white', border: '1px solid #e5e7eb', padding: '8px 16px',
              borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#374151',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            👥 Акції:
          </button>
        </div>
        <CheckView
          check={activeCheck}
          products={products}
          onBack={handleBackToTables}
          onAddItem={handleAddItem}
          onPay={() => setShowPaymentModal(true)}
          onVoid={handleVoidCheck}
          onUpdateCheck={updateCheckState}
        />

        {showPaymentModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Оплата</h2>
              <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#2563eb', marginBottom: '30px', textAlign: 'center' }}>
                {activeCheck?.total.toFixed(2)} ₴
              </div>

              <div className={styles.paymentOptions}>
                <button
                  className={`${styles.paymentOption} ${paymentMethod === 'cash' ? styles.active : ''}`}
                  onClick={() => setPaymentMethod('cash')}
                >
                  <span style={{ fontSize: '2rem' }}>💵</span> Готівка
                </button>
                <button
                  className={`${styles.paymentOption} ${paymentMethod === 'card' ? styles.active : ''}`}
                  onClick={() => setPaymentMethod('card')}
                >
                  <span style={{ fontSize: '2rem' }}>💳</span> Карта
                </button>
              </div>

              {paymentMethod === 'cash' && (
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Внесена сума</label>
                  <input
                    type="number"
                    className={styles.inputField}
                    placeholder="0.00"
                    value={amountGiven}
                    onChange={(e) => setAmountGiven(e.target.value)}
                    autoFocus
                  />
                  {Number(amountGiven) > (activeCheck?.total || 0) && (
                    <div style={{ marginTop: '10px', color: '#166534', fontWeight: 'bold', fontSize: '1.1rem', textAlign: 'right' }}>
                      Решта: <span style={{ fontSize: '1.3rem' }}>{(Number(amountGiven) - (activeCheck?.total || 0)).toFixed(2)} ₴</span>
                    </div>
                  )}
                </div>
              )}

              <div className={styles.modalActions}>
                <button className={styles.cancelButton} onClick={() => setShowPaymentModal(false)}>Скасувати</button>
                <button className={styles.payButton} onClick={handleCheckout}>Підтвердити</button>
              </div>
            </div>
          </div>
        )}

        {showReceiptModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent} style={{ textAlign: 'center', maxWidth: '400px' }}>
              <div style={{ fontSize: '5rem', marginBottom: '20px', color: '#22c55e' }}>✅</div>
              <h2 style={{ marginBottom: '10px' }}>Оплата успішна!</h2>
              <p style={{ color: '#6b7280', marginBottom: '30px' }}>Стіл {selectedTable?.name} звільнено.</p>
              <button className={styles.payButton} onClick={handleFinishReceipt}>
                ОК
              </button>
            </div>
          </div>
        )}

        {showPromotionsModal && (
          <ApplyPromotionModal
            check={activeCheck}
            onClose={() => setShowPromotionsModal(false)}
            onApply={handleApplyPromotion}
          />
        )}
      </div>
    );
  }

  // Tables View
  return (
    <div className={styles.container}>
      <div className={styles.mainArea}>
        <CashRegisterNav
          setShowStaffModal={setShowStaffModal}
          activeStaffIds={activeStaffIds}
          onShowPromotions={() => {
            alert("Спочатку відкрийте чек!");
          }}
          isShiftOpen={!!currentShift}
          onOpenShift={handlePrepareOpenShift}
          onCloseShift={handleInitiateCloseShift}
          onCashOperation={handleTransactionClick}
        />



        <TableSelector
          tables={tables}
          departmentName={selectedDepartment?.name || 'Зал'}
          onSelect={handleTableClick}
          onBack={handleBackToDepartments}
          onAdd={handleAddTable}
        />

        {showTransactionModal && (
          <Modal
            isOpen={true}
            title={
              transactionType === 'income' ? '➕ Внесення коштів' :
                transactionType === 'expense' ? '➖ Витрати' : '🏦 Інкасація'
            }
            onClose={() => setShowTransactionModal(false)}
          >
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#374151' }}>Сума</label>
                <input
                  type="number"
                  value={transactionAmount}
                  onChange={(e) => setTransactionAmount(e.target.value)}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1.2rem', fontWeight: 'bold' }}
                  autoFocus
                />
              </div>

              {transactionType === 'expense' && (
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#374151' }}>Категорія витрат</label>
                  <select
                    value={transactionCategory}
                    onChange={(e) => setTransactionCategory(e.target.value)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                  >
                    <option value="Business Expenses">Господарські витрати</option>
                    <option value="Supplier Payment">Оплата постачальникам</option>
                    <option value="Utilities">Комунальні платежі</option>
                    <option value="Other">Інше</option>
                  </select>
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#374151' }}>Коментар</label>
                <textarea
                  value={transactionComment}
                  onChange={(e) => setTransactionComment(e.target.value)}
                  placeholder={transactionType === 'expense' ? "На що витрачено..." : "Примітка..."}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', minHeight: '60px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button onClick={() => setShowTransactionModal(false)} style={{ padding: '8px 16px', background: '#ccc', borderRadius: '4px', border: 'none' }}>Скасувати</button>
                <button
                  onClick={handleCreateTransaction}
                  style={{
                    padding: '8px 16px',
                    background: transactionType === 'income' ? '#22c55e' : transactionType === 'expense' ? '#ef4444' : '#a855f7',
                    color: 'white',
                    borderRadius: '4px',
                    border: 'none',
                    fontWeight: 'bold'
                  }}
                >
                  Зберегти
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Staff Scheduler Modal */}
        {showStaffModal && (
          <StaffSchedulerModal
            currentActiveIds={activeStaffIds}
            onSave={handleUpdateShiftStaff}
            onClose={() => setShowStaffModal(false)}
            shiftId={currentShift?.id || ''}
            activeStaffIds={activeStaffIds}
          />
        )}
      </div>

      {/* Waiter Selector Modal */}
      {showWaiterModal && (
        <WaiterSelectorModal
          activeStaff={activeStaffList}
          onSelect={(waiter) => {
            setShowWaiterModal(false);
            if (pendingTableForCheck) {
              openCheckForTable(pendingTableForCheck, 1, waiter);
              setPendingTableForCheck(null);
            }
          }}
          onClose={() => {
            setShowWaiterModal(false);
            setPendingTableForCheck(null);
          }}
        />
      )}

      {/* Guest Count Modal */}
      <Modal
        isOpen={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        title="Кількість гостей"
        size="sm"
      >
        <div style={{ padding: '20px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px', fontSize: '1.2rem' }}>
            Стіл: <strong>{pendingTable?.name}</strong>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.inputLabel} style={{ textAlign: 'center' }}>Скільки гостей?</label>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
              <button
                className={styles.qtyButton}
                style={{ width: '50px', height: '50px', fontSize: '1.5rem' }}
                onClick={() => setGuestCountInput(prev => String(Math.max(1, Number(prev) - 1)))}
              >
                -
              </button>
              <input
                type="number"
                className={styles.inputField}
                style={{ width: '80px', textAlign: 'center', fontSize: '1.5rem' }}
                value={guestCountInput}
                onChange={(e) => setGuestCountInput(e.target.value)}
                autoFocus
              />
              <button
                className={styles.qtyButton}
                style={{ width: '50px', height: '50px', fontSize: '1.5rem' }}
                onClick={() => setGuestCountInput(prev => String(Number(prev) + 1))}
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className={styles.modalActions}>
          <button className={styles.cancelButton} onClick={() => setShowGuestModal(false)}>Скасувати</button>
          <button className={styles.payButton} onClick={handleConfirmGuestCount}>Відкрити стіл</button>
        </div>
      </Modal>

      {showShiftModal && (
        <Modal isOpen={true} title="Відкриття зміни" onClose={() => setShowShiftModal(false)}>
          <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#374151' }}>Хто відкриває зміну?</label>
              <select
                value={shiftOpenerId}
                onChange={(e) => setShiftOpenerId(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              >
                <option value="">-- Оберіть співробітника --</option>
                {allStaff.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                ))}
              </select>
            </div>

            <p style={{ marginBottom: '5px' }}>Введіть початкову суму в касі:</p>
            <input
              type="number"
              value={shiftStartBalance}
              onChange={(e) => setShiftStartBalance(e.target.value)}
              style={{ width: '100%', padding: '8px', marginBottom: '20px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowShiftModal(false)} style={{ padding: '8px 16px', background: '#ccc', borderRadius: '4px', border: 'none' }}>Скасувати</button>
              <button
                onClick={() => handleOpenShift(Number(shiftStartBalance), shiftOpenerId)}
                style={{ padding: '8px 16px', background: '#22c55e', color: 'white', borderRadius: '4px', border: 'none' }}
              >
                Відкрити зміну
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showCloseShiftModal && closingShiftData && (
        <Modal isOpen={true} title="Закриття зміни" onClose={() => setShowCloseShiftModal(false)}>
          <div style={{ padding: '20px', minWidth: '350px' }}>
            <div style={{ marginBottom: '20px', background: '#f9fafb', padding: '15px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Початковий залишок:</span>
                <b>{closingShiftData.startBalance.toFixed(2)} ₴</b>
              </div>
              <div style={{ marginBottom: '8px', paddingLeft: '10px', borderLeft: '3px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#6b7280' }}>
                  <span>💵 Готівка:</span>
                  <span>{closingShiftData.totalSalesCash.toFixed(2)} ₴</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#6b7280' }}>
                  <span>💳 Карта:</span>
                  <span>{closingShiftData.totalSalesCard.toFixed(2)} ₴</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Продажі (Всього):</span>
                <b style={{ color: '#16a34a' }}>+ {closingShiftData.totalSales.toFixed(2)} ₴</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Витрати:</span>
                <b style={{ color: '#dc2626' }}>- {closingShiftData.totalExpenses.toFixed(2)} ₴</b>
              </div>
              <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                <span>Розрахунковий залишок (Готівка):</span>
                <b>{closingShiftData.expectedBalance.toFixed(2)} ₴</b>
              </div>
            </div>

            <p style={{ marginBottom: '5px', fontSize: '0.9rem', color: '#6b7280' }}>Введіть фактичну суму в касі:</p>
            <input
              type="number"
              value={shiftEndBalance}
              onChange={(e) => setShiftEndBalance(e.target.value)}
              style={{ width: '100%', padding: '10px', marginBottom: '20px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1.2rem', fontWeight: 'bold' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowCloseShiftModal(false)} style={{ padding: '8px 16px', background: '#ccc', borderRadius: '4px', border: 'none' }}>Скасувати</button>
              <button
                onClick={handleConfirmCloseShift}
                style={{ padding: '8px 16px', background: '#ef4444', color: 'white', borderRadius: '4px', border: 'none', fontWeight: 'bold' }}
              >
                Закрити зміну
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
