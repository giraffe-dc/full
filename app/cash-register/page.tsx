"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";
import { CashRegisterState, Service, Customer, CartItem, Receipt, CashShift, ServiceCategory } from "../../types/cash-register";
import { CashRegisterHeader } from "../../components/cash-register/CashRegisterHeader";
import { ServiceSelector } from "../../components/cash-register/ServiceSelector";
import { ShoppingCart } from "../../components/cash-register/ShoppingCart";
import { CustomerSelector } from "../../components/cash-register/CustomerSelector";
import { CashRegisterStatus } from "../../components/cash-register/CashRegisterStatus";
import { ReceiptModal } from "../../components/cash-register/ReceiptModal";

const DEFAULT_SERVICES: Service[] = [
  // Боулінг
  { id: "bowl-1", name: "Боулінг - 1 година", category: "bowling", price: 150 },
  { id: "bowl-2", name: "Боулінг - 2 години", category: "bowling", price: 280 },
  { id: "bowl-3", name: "Боулінг - 4 години", category: "bowling", price: 500 },
  
  // Більярд
  { id: "bill-1", name: "Більярд - 1 година", category: "billiards", price: 100 },
  { id: "bill-2", name: "Більярд - 2 години", category: "billiards", price: 180 },
  
  // Караоке
  { id: "kara-1", name: "Караоке - 1 година", category: "karaoke", price: 200 },
  { id: "kara-2", name: "Караоке - 2 години", category: "karaoke", price: 350 },
  
  // Ігри
  { id: "game-1", name: "Ігрові автомати - 30 хв", category: "games", price: 50 },
  { id: "game-2", name: "Ігрові автомати - 1 година", category: "games", price: 90 },
  { id: "game-3", name: "VR-гра - 30 хв", category: "games", price: 120 },
  
  // Бар
  { id: "bar-1", name: "Напій - Сік", category: "bar", price: 40 },
  { id: "bar-2", name: "Напій - Кава", category: "bar", price: 60 },
  { id: "bar-3", name: "Закуска - Попкорн", category: "bar", price: 50 },
  { id: "bar-4", name: "Закуска - Чіпси", category: "bar", price: 45 },
];

export default function CashRegisterPage() {
  const [state, setState] = useState<CashRegisterState>({
    currentShift: null,
    currentCart: [],
    customers: [],
    services: DEFAULT_SERVICES,
    receipts: [],
    shifts: [],
    zReports: [],
    lastReceiptNumber: 0,
    lastShiftNumber: 0,
  });

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<Receipt | null>(null);
  const [shiftStartBalance, setShiftStartBalance] = useState("");
  const [showShiftModal, setShowShiftModal] = useState(false);

  // Завантажити дані з localStorage при завантаженні сторінки
  useEffect(() => {
    const savedState = localStorage.getItem("cashRegisterState");
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        setState(parsedState);
      } catch (error) {
        console.error("Помилка при завантаженні стану:", error);
      }
    }
  }, []);

  // Зберегти стан в localStorage при змінах
  useEffect(() => {
    localStorage.setItem("cashRegisterState", JSON.stringify(state));
  }, [state]);

  // Відкрити касу
  const handleOpenShift = (balance: number) => {
    const newShift: CashShift = {
      id: `shift-${Date.now()}`,
      shiftNumber: state.lastShiftNumber + 1,
      startTime: new Date().toISOString(),
      startBalance: balance,
      receipts: [],
      totalSales: 0,
      totalExpenses: 0,
      status: "open",
      cashier: "Касир",
    };

    setState((prev) => ({
      ...prev,
      currentShift: newShift,
      lastShiftNumber: prev.lastShiftNumber + 1,
    }));

    setShowShiftModal(false);
    setShiftStartBalance("");
  };

  // Закрити касу
  const handleCloseShift = () => {
    if (!state.currentShift) return;

    const closedShift: CashShift = {
      ...state.currentShift,
      endTime: new Date().toISOString(),
      status: "closed",
      endBalance: calculateCurrentBalance(),
    };

    const zReport = generateZReport(closedShift);

    setState((prev) => ({
      ...prev,
      currentShift: null,
      shifts: [...prev.shifts, closedShift],
      zReports: [...prev.zReports, zReport],
    }));
  };

  // Додати товар в кошик
  const handleAddToCart = (service: Service) => {
    if (!state.currentShift) {
      alert("Каса закрита. Відкрийте касу перед продажем.");
      return;
    }

    setState((prev) => {
      const existingItem = prev.currentCart.find((item) => item.serviceId === service.id);

      if (existingItem) {
        return {
          ...prev,
          currentCart: prev.currentCart.map((item) =>
            item.serviceId === service.id
              ? {
                  ...item,
                  quantity: item.quantity + 1,
                  subtotal: (item.quantity + 1) * item.price,
                }
              : item
          ),
        };
      }

      return {
        ...prev,
        currentCart: [
          ...prev.currentCart,
          {
            serviceId: service.id,
            serviceName: service.name,
            category: service.category,
            price: service.price,
            quantity: 1,
            subtotal: service.price,
          },
        ],
      };
    });
  };

  // Видалити товар з кошика
  const handleRemoveFromCart = (serviceId: string) => {
    setState((prev) => ({
      ...prev,
      currentCart: prev.currentCart.filter((item) => item.serviceId !== serviceId),
    }));
  };

  // Змінити кількість товару
  const handleUpdateQuantity = (serviceId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(serviceId);
      return;
    }

    setState((prev) => ({
      ...prev,
      currentCart: prev.currentCart.map((item) =>
        item.serviceId === serviceId
          ? {
              ...item,
              quantity,
              subtotal: quantity * item.price,
            }
          : item
      ),
    }));
  };

  // Розрахувати загальну суму
  const calculateTotal = () => {
    const subtotal = state.currentCart.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = subtotal * 0.1; // 10% податок
    return { subtotal, tax, total: subtotal + tax };
  };

  // Розрахувати поточний баланс каси
  const calculateCurrentBalance = () => {
    if (!state.currentShift) return 0;
    const totalSales = state.currentShift.receipts.reduce((sum, receipt) => sum + receipt.total, 0);
    return state.currentShift.startBalance + totalSales;
  };

  // Оформити чек
  const handleCheckout = (paymentMethod: "cash" | "card" | "mixed") => {
    if (!state.currentShift) {
      alert("Каса закрита.");
      return;
    }

    if (state.currentCart.length === 0) {
      alert("Кошик порожній.");
      return;
    }

    const { subtotal, tax, total } = calculateTotal();

    const receipt: Receipt = {
      id: `receipt-${Date.now()}`,
      receiptNumber: state.lastReceiptNumber + 1,
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name,
      items: state.currentCart,
      subtotal,
      tax,
      total,
      paymentMethod,
      createdAt: new Date().toISOString(),
      shiftId: state.currentShift.id,
    };

    // Оновити дані клієнта
    if (selectedCustomer) {
      setState((prev) => ({
        ...prev,
        customers: prev.customers.map((c) =>
          c.id === selectedCustomer.id
            ? {
                ...c,
                visits: c.visits + 1,
                totalSpent: c.totalSpent + total,
                lastVisit: new Date().toISOString(),
              }
            : c
        ),
      }));
    }

    // Додати чек до зміни
    setState((prev) => ({
      ...prev,
      currentShift: prev.currentShift
        ? {
            ...prev.currentShift,
            receipts: [...prev.currentShift.receipts, receipt],
            totalSales: prev.currentShift.totalSales + total,
          }
        : null,
      currentCart: [],
      receipts: [...prev.receipts, receipt],
      lastReceiptNumber: prev.lastReceiptNumber + 1,
    }));

    setLastReceipt(receipt);
    setShowReceiptModal(true);
    setSelectedCustomer(null);
  };

  // Створити Z-звіт
  const generateZReport = (shift: CashShift) => {
    const startTime = new Date(shift.startTime);
    const endTime = new Date(shift.endTime || new Date());
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

    const salesByCategory: Record<ServiceCategory, number> = {
      bowling: 0,
      billiards: 0,
      karaoke: 0,
      games: 0,
      bar: 0,
    };

    const topServices: Array<{
      serviceId: string;
      serviceName: string;
      quantity: number;
      total: number;
    }> = [];

    shift.receipts.forEach((receipt) => {
      receipt.items.forEach((item) => {
        salesByCategory[item.category] += item.subtotal;

        const existingService = topServices.find((s) => s.serviceId === item.serviceId);
        if (existingService) {
          existingService.quantity += item.quantity;
          existingService.total += item.subtotal;
        } else {
          topServices.push({
            serviceId: item.serviceId,
            serviceName: item.serviceName,
            quantity: item.quantity,
            total: item.subtotal,
          });
        }
      });
    });

    topServices.sort((a, b) => b.total - a.total);

    return {
      id: `zreport-${Date.now()}`,
      shiftId: shift.id,
      shiftNumber: shift.shiftNumber,
      status: "closed" as const,
      startTime: shift.startTime,
      endTime: shift.endTime || new Date().toISOString(),
      duration,
      startBalance: shift.startBalance,
      endBalance: shift.endBalance || 0,
      receiptsCount: shift.receipts.length,
      totalSales: shift.totalSales,
      totalExpenses: shift.totalExpenses,
      cashDifference: (shift.endBalance || 0) - shift.startBalance - shift.totalSales,
      salesByCategory,
      topServices: topServices.slice(0, 5),
      createdAt: new Date().toISOString(),
    };
  };

  return (
    <div className={styles.container}>
      <CashRegisterHeader
        shiftNumber={state.currentShift?.shiftNumber}
        isOpen={state.currentShift?.status === "open"}
        onOpenShift={() => setShowShiftModal(true)}
        onCloseShift={handleCloseShift}
      />

      <div className={styles.mainContent}>
        <div className={styles.leftPanel}>
          <ServiceSelector services={state.services} onSelectService={handleAddToCart} />
        </div>

        <div className={styles.rightPanel}>
          <CashRegisterStatus
            currentBalance={calculateCurrentBalance()}
            receiptsCount={state.currentShift?.receipts.length || 0}
            isOpen={state.currentShift?.status === "open"}
          />

          <CustomerSelector
            customers={state.customers}
            selectedCustomer={selectedCustomer}
            onSelectCustomer={setSelectedCustomer}
            onAddCustomer={(newCustomer: Customer) => {
              setState((prev) => ({
                ...prev,
                customers: [...prev.customers, newCustomer],
              }));
            }}
          />

          <ShoppingCart
            items={state.currentCart}
            onRemoveItem={handleRemoveFromCart}
            onUpdateQuantity={handleUpdateQuantity}
            onCheckout={handleCheckout}
            totals={calculateTotal()}
          />
        </div>
      </div>

      {showShiftModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Відкрити касу</h2>
            <input
              type="number"
              placeholder="Початковий баланс"
              value={shiftStartBalance}
              onChange={(e) => setShiftStartBalance(e.target.value)}
              className={styles.input}
            />
            <div className={styles.modalButtons}>
              <button
                onClick={() => handleOpenShift(Number(shiftStartBalance) || 0)}
                className={styles.buttonPrimary}
              >
                Відкрити
              </button>
              <button
                onClick={() => setShowShiftModal(false)}
                className={styles.buttonSecondary}
              >
                Скасувати
              </button>
            </div>
          </div>
        </div>
      )}

      {showReceiptModal && lastReceipt && (
        <ReceiptModal
          receipt={lastReceipt}
          onClose={() => setShowReceiptModal(false)}
          onPrint={() => window.print()}
        />
      )}
    </div>
  );
}
