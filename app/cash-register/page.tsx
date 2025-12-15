

"use client";

import { useEffect, useState, useMemo } from "react";
import styles from "./page_v2.module.css";
import { CashRegisterState, Service, Customer, CartItem, Receipt, CashShift, ServiceCategory } from "../../types/cash-register";
import { MenuProduct, ProductCategory } from "../../types/accounting";
import { Modal } from "../../components/ui";

export default function CashRegisterPage() {
  const [products, setProducts] = useState<Service[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  // State initialization
  const [state, setState] = useState<CashRegisterState>({
    currentShift: null,
    currentCart: [],
    customers: [],
    services: [], // We'll populate this from API
    receipts: [],
    shifts: [],
    zReports: [],
    lastReceiptNumber: 0,
    lastShiftNumber: 0,
  });

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any | null>(null); // Using any for receipt temporarily to match API resp
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftStartBalance, setShiftStartBalance] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mixed'>('cash');
  const [amountGiven, setAmountGiven] = useState("");

  // Load Initial State and Data
  useEffect(() => {
    const savedState = localStorage.getItem("cashRegisterState");
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        // Restore shift if open
        if (parsed.currentShift && parsed.currentShift.status === 'open') {
          setState(prev => ({ ...prev, ...parsed }));
        } else {
          // Even if closed, we might want some history, but safe to just keep shift data
          setState(prev => ({ ...prev, ...parsed }));
        }
      } catch (e) { console.error("State load error", e); }
    }

    fetchData();
  }, []);

  // Save State
  useEffect(() => {
    localStorage.setItem("cashRegisterState", JSON.stringify(state));
  }, [state]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, catRes, shiftRes] = await Promise.all([
        fetch('/api/accounting/products?status=active'),
        fetch('/api/accounting/categories?status=active'),
        fetch('/api/cash-register/shifts?status=open')
      ]);

      const prodData = await prodRes.json();
      const catData = await catRes.json();
      const shiftData = await shiftRes.json();

      if (prodData.success) {
        // Map API products to Service type expected by UI
        const services: Service[] = prodData.data.map((p: any) => ({
          id: p.id || p._id,
          name: p.name,
          category: p.category, // string
          price: p.sellingPrice,
          code: p.code,
          imageUrl: p.imageUrl
        }));

        // Deduplicate
        const uniqueServices = Array.from(new Map(services.map(s => [s.id, s])).values());

        setProducts(uniqueServices);
        setState(prev => ({ ...prev, services: uniqueServices }));
      }

      if (catData.success) {
        // Add 'All' category
        setCategories([{ id: 'all', name: 'Всі' }, ...catData.data]);
      }

      if (shiftData.success && shiftData.data.length > 0) {
        const activeShift = shiftData.data[0];
        setState(prev => ({
          ...prev,
          currentShift: {
            ...activeShift,
            receipts: [] // We don't load all receipts for performance, just the shift meta
          }
        }));
      }

    } catch (e) {
      console.error("Failed to fetch data", e);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handlers ---

  const handleOpenShift = async (balance: number) => {
    try {
      const res = await fetch('/api/cash-register/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startBalance: balance, cashier: 'Admin' })
      });
      const data = await res.json();
      if (data.success) {
        setState(prev => ({
          ...prev,
          currentShift: { ...data.data, receipts: [] }
        }));
        setShowShiftModal(false);
      } else {
        alert("Помилка: " + data.error);
      }
    } catch (e) {
      alert("Помилка мережі");
    }
  };

  const handleCloseShift = async () => {
    if (!state.currentShift) return;
    const endBalance = prompt("Введіть фактичну суму в касі:", "0");
    if (endBalance === null) return;

    try {
      const res = await fetch('/api/cash-register/shifts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: state.currentShift.id, endBalance: Number(endBalance) })
      });
      const data = await res.json();

      if (data.success) {
        alert("Зміна закрита успішно!");
        setState(prev => ({ ...prev, currentShift: null }));
      } else {
        alert("Помилка: " + data.error);
      }
    } catch (e) {
      alert("Помилка мережі");
    }
  };

  const addToCart = (product: Service) => {
    if (!state.currentShift) {
      alert("Спочатку відкрийте зміну!");
      setShowShiftModal(true);
      return;
    }

    setState(prev => {
      const existing = prev.currentCart.find(item => item.productId === product.id); // Use productId check logic
      if (existing) {
        return {
          ...prev,
          currentCart: prev.currentCart.map(item =>
            item.productId === product.id
              ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.price }
              : item
          )
        };
      }
      return {
        ...prev,
        currentCart: [...prev.currentCart, {
          serviceId: `item-${Date.now()}`, // Temporary ID for cart logic
          productId: product.id,
          serviceName: product.name,
          category: product.category,
          price: product.price,
          quantity: 1,
          subtotal: product.price
        }]
      };
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setState(prev => {
      const newCart = prev.currentCart.map(item => {
        if (item.productId === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          return { ...item, quantity: newQty, subtotal: newQty * item.price };
        }
        return item;
      }).filter(Boolean) as CartItem[];
      return { ...prev, currentCart: newCart };
    });
  };

  const removeFromCart = (productId: string) => {
    setState(prev => ({
      ...prev,
      currentCart: prev.currentCart.filter(item => item.productId !== productId)
    }));
  };

  const getTotals = () => {
    const subtotal = state.currentCart.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = 0; // Simplified for now
    return { subtotal, tax, total: subtotal + tax };
  };

  const handleCheckout = async () => {
    if (!state.currentShift) return;
    const { total, subtotal, tax } = getTotals();

    const payload = {
      items: state.currentCart,
      paymentMethod,
      total,
      subtotal,
      tax,
      customerId: selectedCustomer?.id,
      shiftId: state.currentShift.id
    };

    try {
      const res = await fetch('/api/cash-register/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        // Success
        const newReceipt: Receipt = {
          id: data.receiptId || `local-${Date.now()}`,
          receiptNumber: state.lastReceiptNumber + 1,
          items: state.currentCart,
          total,
          subtotal,
          tax,
          paymentMethod,
          createdAt: new Date().toISOString(),
          shiftId: state.currentShift.id
        };

        setLastReceipt(newReceipt);

        // Clear Cart & Update State
        setState(prev => ({
          ...prev,
          currentCart: [],
          receipts: [...prev.receipts, newReceipt],
          lastReceiptNumber: prev.lastReceiptNumber + 1,
          currentShift: prev.currentShift ? {
            ...prev.currentShift,
            receipts: [...prev.currentShift.receipts, newReceipt],
            totalSales: prev.currentShift.totalSales + total
          } : null
        }));

        setShowPaymentModal(false);
        setShowReceiptModal(true);
        setAmountGiven(""); // Reset
      } else {
        alert("Помилка при проведенні чеку: " + data.error);
      }
    } catch (e) {
      alert("Помилка мережі");
      console.error(e);
    }
  };


  const [searchQuery, setSearchQuery] = useState("");


  // Filtered Products
  const filteredProducts = useMemo(() => {
    let result = products;

    // 1. Search Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(p => {
        const name = p.name ? String(p.name).toLowerCase() : '';
        const code = p.code ? String(p.code).toLowerCase() : '';
        return name.includes(query) || code.includes(query);
      });
    }

    // 2. Category Filter
    if (selectedCategory !== 'all') {
      result = result.filter(p => p.category === selectedCategory);
    }

    return result;
  }, [products, selectedCategory, searchQuery]);

  const { total } = getTotals();

  // Helper to get category icon (random placeholder logic or map)
  const getCategoryIcon = (catId: string, name: string) => {
    if (catId === 'all') return '♾️';
    if (name.toLowerCase().includes('кав')) return '☕';
    if (name.toLowerCase().includes('десерт') || name.toLowerCase().includes('торт')) return '🍰';
    if (name.toLowerCase().includes('бар') || name.toLowerCase().includes('напо')) return '🍹';
    if (name.toLowerCase().includes('салат') || name.toLowerCase().includes('їжа')) return '🥗';
    return '📦';
  };

  /* 
   * V2 Redesign Layout (No Categories, Vibrant)
   * Removing sidebar code.
   */

  return (
    <div className={styles.container}>

      {/* 2. MAIN CONTENT (Header + Grid) */}
      <div className={styles.mainContent}>

        {/* Header */}
        <div className={styles.header}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            {state.currentShift ? (
              <div className={styles.statusBadge} style={{ background: '#dcfce7', color: '#166534' }}>
                🟢 Зміна #{state.currentShift.shiftNumber} ({state.currentShift.cashier})
              </div>
            ) : (
              <div className={styles.statusBadge} style={{ background: '#fee2e2', color: '#991b1b' }}>
                🔴 Каса закрита
              </div>
            )}
          </div>

          <div style={{ flex: 1, margin: '0 30px', position: 'relative' }}>
            <input
              className={styles.inputField}
              style={{ width: '100%', paddingLeft: '46px', fontSize: '1.1rem' }}
              placeholder="🔍 Пошук товару..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: '1.2rem' }}>🔍</span>
          </div>

          <div>
            {!state.currentShift ? (
              <button className={styles.payButton} style={{ width: 'auto', padding: '10px 24px', fontSize: '1rem' }} onClick={() => setShowShiftModal(true)}>
                Відкрити зміну
              </button>
            ) : (
              <button className={styles.payButton} style={{ width: 'auto', padding: '10px 24px', fontSize: '1rem', background: '#4b5563' }} onClick={handleCloseShift}>
                Закрити зміну
              </button>
            )}
          </div>
        </div>

        {/* Product Grid */}
        <div className={styles.productGrid}>
          {filteredProducts.map(product => (
            <div key={product.id} className={styles.productCard} onClick={() => addToCart(product)}>
              <div className={styles.productImage}>
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span>{product.name[0]}</span>
                )}
              </div>
              <div className={styles.productInfo}>
                <div className={styles.productName}>{product.name}</div>
                <div className={styles.productPrice}>{product.price} ₴</div>
              </div>
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', marginTop: '50px', color: '#9ca3af' }}>
              <h3>Товарів не знайдено 🔍</h3>
              <p>Спробуйте змінити пошуковий запит</p>
            </div>
          )}
        </div>

      </div>

      {/* 3. CART PANEL (Right) */}
      <div className={styles.cartPanel}>
        <div className={styles.cartHeader}>
          <div className={styles.cartTitle}>Замовлення</div>
          <div className={styles.statusBadge} style={{ background: '#f3f4f6', color: '#4b5563' }}>
            {state.currentCart.length} поз.
          </div>
        </div>

        <div className={styles.cartItems}>
          {state.currentCart.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: '80px', opacity: 0.6 }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🛒</div>
              <p>Кошик порожній</p>
            </div>
          ) : (
            state.currentCart.map(item => (
              <div key={item.serviceId} className={styles.cartItem}>
                <div className={styles.cartItemInfo}>
                  <div className={styles.cartItemName}>{item.serviceName}</div>
                  <div className={styles.cartItemPrice}>{item.price} ₴</div>
                </div>
                <div className={styles.cartControls}>
                  <button className={styles.qtyButton} onClick={() => updateQuantity(item.productId!, -1)}>−</button>
                  <div className={styles.qtyValue}>{item.quantity}</div>
                  <button className={styles.qtyButton} onClick={() => updateQuantity(item.productId!, 1)}>+</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className={styles.cartFooter}>
          <div className={styles.summaryRow}>
            <span>Знижка</span>
            <span>0.00 ₴</span>
          </div>
          <div className={styles.totalRow}>
            <span>Разом</span>
            <span style={{ color: '#2563eb' }}>{total} ₴</span>
          </div>
          <button
            className={styles.payButton}
            disabled={state.currentCart.length === 0}
            onClick={() => setShowPaymentModal(true)}
          >
            Оплатити ({total} ₴)
          </button>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Оплата</h2>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#2563eb', marginBottom: '30px', textAlign: 'center' }}>{total} ₴</div>

            <div className={styles.paymentOptions}>
              <button
                className={`${styles.paymentOption} ${paymentMethod === 'cash' ? styles.active : ''}`}
                onClick={() => setPaymentMethod('cash')}
              >
                <span style={{ fontSize: '2rem' }}>💵</span>
                Готівка
              </button>
              <button
                className={`${styles.paymentOption} ${paymentMethod === 'card' ? styles.active : ''}`}
                onClick={() => setPaymentMethod('card')}
              >
                <span style={{ fontSize: '2rem' }}>💳</span>
                Карта
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
                  style={{ fontSize: '1.2rem' }}
                />
                {Number(amountGiven) > total && (
                  <div style={{ marginTop: '10px', color: '#166534', fontWeight: 'bold', fontSize: '1.1rem', textAlign: 'right' }}>
                    Решта: <span style={{ fontSize: '1.3rem' }}>{(Number(amountGiven) - total).toFixed(2)} ₴</span>
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

      {/* Shift Modal */}
      {/* Shift Opening Modal */}
      <Modal
        isOpen={showShiftModal}
        onClose={() => setShowShiftModal(false)}
        title="Відкриття зміни"
        size="sm"
      >
        <div style={{ padding: 'var(--space-4) 0' }}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Початковий баланс каси (₴)</label>
            <input
              type="number"
              className={styles.inputField}
              value={shiftStartBalance}
              onChange={(e) => setShiftStartBalance(e.target.value)}
              placeholder="0.00"
              autoFocus
            />
          </div>
        </div>

        <div className={styles.modalActions}>
          <button
            className={styles.cancelButton}
            onClick={() => setShowShiftModal(false)}
          >
            Скасувати
          </button>
          <button
            className={styles.payButton}
            onClick={() => handleOpenShift(Number(shiftStartBalance) || 0)}
          >
            Відкрити зміну
          </button>
        </div>
      </Modal>

      {/* Receipt Success Modal */}
      {showReceiptModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ fontSize: '5rem', marginBottom: '20px', color: '#22c55e' }}>✅</div>
            <h2 style={{ marginBottom: '10px' }}>Оплата успішна!</h2>
            <p style={{ color: '#6b7280', marginBottom: '30px' }}>Чек #{lastReceipt?.receiptNumber} збережено.</p>
            <button className={styles.payButton} onClick={() => setShowReceiptModal(false)}>
              Нове замовлення
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

