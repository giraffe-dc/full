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
import { useToast } from "../../components/ui/ToastContext";
import { Preloader } from "@/components/ui/Preloader";

// New Modals
import { TransactionModal } from "@/components/cash-register/modals/TransactionModal";
import { ShiftModals } from "@/components/cash-register/modals/ShiftModals";
import { PaymentModal } from "@/components/cash-register/modals/PaymentModal";

type ViewState = 'departments' | 'tables' | 'check';

export default function CashRegisterPage() {
  const toast = useToast();

  // --- Global Data ---
  const [products, setProducts] = useState<Service[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [allStaff, setAllStaff] = useState<any[]>([]);

  // --- UI State ---
  const [isLoading, setIsLoading] = useState(true);

  // --- Navigation State ---
  const [view, setView] = useState<ViewState>('departments');
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [activeCheck, setActiveCheck] = useState<Check | null>(null);
  const [orders, setOrders] = useState<Check[]>([]);

  // --- Shift State ---
  const [currentShift, setCurrentShift] = useState<any | null>(null);
  const [activeStaffIds, setActiveStaffIds] = useState<string[]>([]);
  const [shiftStartBalance, setShiftStartBalance] = useState("");
  const [closingShiftData, setClosingShiftData] = useState<any>(null); // Type this properly if needed

  // --- Modal Visibility State ---
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showWaiterModal, setShowWaiterModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false); // Open Shift
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false); // Close Shift
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense' | 'incasation'>('expense');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showPromotionsModal, setShowPromotionsModal] = useState(false);

  // --- Temporary State for Modals (passed to components or kept for logic) ---
  const [pendingTableForCheck, setPendingTableForCheck] = useState<Table | null>(null);
  const [pendingTable, setPendingTable] = useState<Table | null>(null);
  const [guestCountInput, setGuestCountInput] = useState("1");
  const [lastReceipt, setLastReceipt] = useState<Receipt | null>(null);

  // --- Initial Load ---
  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (view === 'tables') {
      fetchChecks();
    }
  }, [view]);

  // --- Fetchers ---
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
      const [prodRes, deptRes, shiftRes, staffRes, checksRes, recipesRes] = await Promise.all([
        fetch('/api/accounting/products?status=active'),
        fetch('/api/cash-register/departments'),
        fetch('/api/cash-register/shifts?status=open'),
        fetch('/api/staff'),
        fetch('/api/cash-register/checks?status=open'),
        fetch('/api/accounting/recipes?status=active'),
      ]);

      const prodData = await prodRes.json();
      const deptData = await deptRes.json();
      const shiftData = await shiftRes.json();
      const staffData = await staffRes.json();
      const checksData = await checksRes.json();
      const recipesData = await recipesRes.json();

      if (prodData.success) {
        const services: Service[] = prodData.data.map((p: any) => ({
          id: p._id,
          name: p.name,
          category: p.category,
          price: p.sellingPrice,
          code: p.code,
          imageUrl: p.imageUrl
        }));
        const recipes: Service[] = recipesData.data.map((r: any) => ({
          id: r._id,
          name: r.name,
          category: r.category,
          price: r.sellingPrice,
          code: r.code,
          imageUrl: r.imageUrl
        }));
        const uniqueServices = Array.from(new Map(services.map(s => [s.id, s])).values());
        const uniqueRecipes = Array.from(new Map(recipes.map(r => [r.id, r])).values());
        setProducts([...uniqueServices, ...uniqueRecipes]);
      }

      if (deptData.success) setDepartments(deptData.data);

      if (shiftData.success && shiftData.data.length > 0) {
        const shift = shiftData.data[0];
        setCurrentShift(shift);
        if (shift.activeStaffIds) setActiveStaffIds(shift.activeStaffIds);
      }

      if (staffData) {
        const mappedStaff = staffData.data.map((s: any) => ({ ...s, id: s._id }));
        setAllStaff(mappedStaff);
      }

      if (checksData.success) setOrders(checksData.data);

    } catch (e) {
      console.error("Failed to fetch data", e);
    } finally {
      setIsLoading(false);
    }
  }

  // --- Handlers ---

  // Shift Handlers
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
      toast.error("Error updating shift staff");
    }
  };

  const handlePrepareOpenShift = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/cash-register/shifts?status=closed&limit=1', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setShiftStartBalance(data.data[0].endBalance?.toString() || "");
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

  const handleOpenShift = async (balance: number, cashierId: string) => {
    if (!cashierId) {
      toast.error("Оберіть співробітника, що відкриває зміну");
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
        toast.success("Зміну відкрито!");
        setCurrentShift({ ...data.data, receipts: [] });
        setActiveStaffIds([cashierId]);
        setShowShiftModal(false);
      } else {
        toast.error("Помилка: " + data.error);
      }
    } catch (e) {
      toast.error("Помилка мережі");
    }
  };

  const handleInitiateCloseShift = async () => {
    if (!currentShift) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/cash-register/shifts/${currentShift.id}/close-preview`);
      const data = await res.json();
      if (data.success) {
        setClosingShiftData(data.data);
        setShowCloseShiftModal(true);
      } else {
        toast.error("Не вдалося отримати дані для закриття зміни");
      }
    } catch (e) {
      toast.error("Помилка при підготовці закриття зміни");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseShift = async (endBalance: number) => {
    if (!currentShift) return;
    try {
      const res = await fetch('/api/cash-register/shifts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentShift.id,
          status: 'closed',
          endBalance: endBalance,
          closedAt: new Date(),
          totals: closingShiftData // Pass calculated totals to save in DB if schema supports it
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Зміну закрито!");
        setCurrentShift(null);
        setShowCloseShiftModal(false);
        setClosingShiftData(null);
        setView('departments');
      } else {
        toast.error("Помилка при закритті зміни: " + data.error);
      }
    } catch (e) {
      toast.error("Помилка мережі");
    }
  };

  // Transaction Handlers
  const handleTransactionClick = (type: 'income' | 'expense' | 'incasation') => {
    setTransactionType(type);
    setShowTransactionModal(true);
  };

  // Check/Table Logic
  const activeStaffList = allStaff.filter(s => activeStaffIds.includes(s.id));

  const handleSelectDepartment = async (dept: Department) => {
    if (!currentShift) {
      toast.error("Спочатку відкрийте зміну!");
      return;
    }
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

  const handleBackToDepartments = () => {
    setSelectedDepartment(null);
    setView('departments');
  };

  const handleBackToTables = () => {
    setActiveCheck(null);
    setSelectedTable(null);
    if (selectedDepartment) handleSelectDepartment(selectedDepartment);
    setView('tables');
  };

  const handleTableClick = (table: Table) => {
    if (table.status === 'busy') {
      openCheckForTable(table);
    } else {
      if (activeStaffList.length === 0) {
        toast.error("Нікого немає на зміні! Додайте співробітників.");
        setShowStaffModal(true);
        return;
      }
      if (activeStaffList.length === 1) {
        setPendingTable(table);
        setGuestCountInput("1");
        setShowGuestModal(true);
      } else {
        setPendingTableForCheck(table);
        setShowWaiterModal(true);
      }
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

    const existingCheck = orders.find(o => o.tableId === table.id && o.status === 'open');
    if (existingCheck) {
      setActiveCheck(existingCheck);
      setView('check');
      setIsLoading(false);
      return;
    }

    let waiterName = waiter?.name;
    let waiterId = waiter?.id;

    if (!waiterName && activeStaffList.length === 1) {
      waiterName = activeStaffList[0].name;
      waiterId = activeStaffList[0].id;
    }

    try {
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
        const updatedTables = tables.map(t => t.id === table.id ? { ...t, status: 'busy' as const } : t);
        setTables(updatedTables);
        setOrders([...orders, data.data]);
      }
    } catch (e) {
      console.error(e);
      toast.error("Помилка при відкритті столу");
    } finally {
      setIsLoading(false);
    }
  };

  // Check Logic
  const saveCheck = async (check: Check) => {
    try {
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

  const handleAddItem = (item: CartItem) => {
    if (!activeCheck) return;

    let updatedItems = [...activeCheck.items];
    const existingItemIndex = updatedItems.findIndex(i => i.serviceId === item.serviceId && JSON.stringify(i.modifiers) === JSON.stringify(item.modifiers));

    if (existingItemIndex >= 0) {
      updatedItems[existingItemIndex].quantity += item.quantity;
    } else {
      updatedItems.push(item);
    }

    // Recalculate totals
    const subtotal = updatedItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    // Apply discount if any
    const discountAmount = activeCheck.discount ? (subtotal * activeCheck.discount / 100) : 0;
    const total = subtotal - discountAmount;

    const updatedCheck = {
      ...activeCheck,
      items: updatedItems,
      subtotal,
      total
    };
    updateCheckState(updatedCheck);
  };

  const handleVoidCheck = async (checkId: string) => {
    if (!confirm("Ви впевнені, що хочете анулювати цей чек?")) return;
    try {
      await fetch(`/api/cash-register/checks/${checkId}/void`, { method: 'POST' });
      toast.success("Чек анульовано");
      handleBackToTables();
    } catch (e) {
      toast.error("Помилка анулювання");
    }
  };

  const handleCheckout = async (method: 'cash' | 'card' | 'mixed', amounts: { cash: number, card: number }, amountGiven: string) => {
    if (!activeCheck) return;

    try {
      const res = await fetch('/api/cash-register/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Pass full check data
          ...activeCheck,
          checkId: activeCheck.id,
          paymentMethod: method,
          amountGiven: Number(amountGiven) || activeCheck.total,
          paymentDetails: method === 'mixed' ? amounts : undefined,
          // Explicitly map some fields if needed by backend, though spread should cover most
          shiftId: currentShift.id,
          waiterId: activeCheck.waiterId,
          waiterName: activeCheck.waiterName,
          tableName: activeCheck.tableName,
          tableId: activeCheck.tableId, // Added explicit tableId
          guestsCount: activeCheck.guestsCount,
          departmentId: activeCheck.departmentId,
          customerId: activeCheck.customerId,
          comment: activeCheck.comment,
        })
      });
      const data = await res.json();
      if (data.success) {
        setLastReceipt(data.data as Receipt);

        // Remove check from local state immediately
        setOrders(prev => prev.filter(o => o.id !== activeCheck.id));
        setTables(prev => prev.map(t => t.id === activeCheck.tableId ? { ...t, status: 'free' } : t));

        setShowPaymentModal(false);
        setShowReceiptModal(true);
      } else {
        toast.error("Помилка оплати: " + data.error);
      }
    } catch (e) {
      toast.error("Помилка мережі при оплаті");
    }
  };

  const handleFinishReceipt = () => {
    setShowReceiptModal(false);
    setLastReceipt(null);
    handleBackToTables();
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
      if (data.success) setTables([...tables, data.data]);
    } catch (e) {
      toast.error("Помилка при створенні столу");
    }
  };

  // --- Render ---

  if (isLoading) {
    return <Preloader message="Завантаження каси..." />;
  }

  return (
    <div className={styles.container}>
      <CashRegisterNav
        setShowStaffModal={setShowStaffModal}
        activeStaffIds={activeStaffIds}
        onShowPromotions={() => toast.error("Спочатку відкрийте чек!")}
        isShiftOpen={!!currentShift}
        onOpenShift={handlePrepareOpenShift}
        onCloseShift={handleInitiateCloseShift}
        onCashOperation={handleTransactionClick}
      />

      <main className={styles.main}>
        {view === 'departments' && (
          <DepartmentSelector
            departments={departments}
            onSelect={handleSelectDepartment}
            onAdd={() => { }}
            activeId={selectedDepartment?.id || null}
            orders={orders}
          />
        )}

        {view === 'tables' && (
          <TableSelector
            tables={tables}
            departmentName={selectedDepartment?.name || 'Зал'}
            onSelect={handleTableClick}
            onBack={handleBackToDepartments}
            onAdd={handleAddTable}
            orders={orders}
          />
        )}

        {view === 'check' && activeCheck && (
          <CheckView
            check={activeCheck}
            products={products}
            onBack={handleBackToTables}
            onAddItem={handleAddItem}
            onPay={() => setShowPaymentModal(true)}
            onVoid={() => handleVoidCheck(activeCheck!.id)}
            onUpdateCheck={updateCheckState}
          />
        )}
      </main>

      {/* Modals Refactored */}
      <TransactionModal
        isOpen={showTransactionModal}
        type={transactionType}
        onClose={() => setShowTransactionModal(false)}
        shiftId={currentShift?.id || ''}
        activeStaffIds={activeStaffIds}
        allStaff={allStaff}
        onSuccess={() => { }} // Maybe refresh shift data?
      />

      <ShiftModals
        showOpenShiftModal={showShiftModal}
        showCloseShiftModal={showCloseShiftModal}
        onCloseOpenShift={() => setShowShiftModal(false)}
        onCloseCloseShift={() => setShowCloseShiftModal(false)}
        onOpenShift={handleOpenShift}
        onCloseShift={handleCloseShift}
        staff={allStaff}
        closingData={closingShiftData}
        lastShiftEndBalance={shiftStartBalance}
      />

      <PaymentModal
        isOpen={showPaymentModal}
        check={activeCheck}
        onClose={() => setShowPaymentModal(false)}
        onPay={handleCheckout}
        receipt={lastReceipt}
        showReceiptModal={showReceiptModal}
        onCloseReceipt={handleFinishReceipt}
      />

      {showStaffModal && (
        <StaffSchedulerModal
          currentActiveIds={activeStaffIds}
          onSave={handleUpdateShiftStaff}
          onClose={() => setShowStaffModal(false)}
          shiftId={currentShift?.id || ''}
          activeStaffIds={activeStaffIds}
        />
      )}

      {showWaiterModal && pendingTableForCheck && (
        <WaiterSelectorModal
          activeStaff={activeStaffList}
          onSelect={(waiter) => {
            openCheckForTable(pendingTableForCheck, 0, waiter);
            setShowWaiterModal(false);
            setPendingTableForCheck(null);
          }}
          onClose={() => {
            setShowWaiterModal(false);
            setPendingTableForCheck(null);
          }}
        />
      )}

      {showGuestModal && (
        <Modal title="👥 Кількість гостей" isOpen={true} onClose={() => setShowGuestModal(false)}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <input
              type="number"
              value={guestCountInput}
              onChange={e => setGuestCountInput(e.target.value)}
              style={{ fontSize: '2rem', width: '100px', textAlign: 'center', padding: '10px' }}
              autoFocus
            />
            <div style={{ marginTop: '20px' }}>
              <button onClick={handleConfirmGuestCount} style={{ padding: '10px 20px', background: '#2563eb', color: 'white', borderRadius: '8px', border: 'none', fontSize: '1.2rem' }}>
                Підтвердити
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showPromotionsModal && activeCheck && (
        <ApplyPromotionModal
          check={activeCheck}
          onClose={() => setShowPromotionsModal(false)}
          onApply={() => { }}
        />
      )}

    </div>
  );
}
