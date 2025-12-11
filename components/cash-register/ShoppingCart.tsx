import React from 'react';
import { CartItem } from '../../types/cash-register';
import styles from './ShoppingCart.module.css';

interface ShoppingCartProps {
  items: CartItem[];
  totals: {
    subtotal: number;
    tax: number;
    total: number;
  };
  onRemoveItem: (serviceId: string) => void;
  onUpdateQuantity: (serviceId: string, quantity: number) => void;
  onCheckout: (paymentMethod: 'cash' | 'card' | 'mixed') => void;
}

export function ShoppingCart({
  items,
  totals,
  onRemoveItem,
  onUpdateQuantity,
  onCheckout,
}: ShoppingCartProps) {
  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Кошик</h3>

      <div className={styles.itemsList}>
        {items.length === 0 ? (
          <div className={styles.emptyCart}>
            <p>Кошик порожній</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.serviceId} className={styles.cartItem}>
              <div className={styles.itemInfo}>
                <div className={styles.itemName}>{item.serviceName}</div>
                <div className={styles.itemPrice}>{item.price} ₴</div>
              </div>

              <div className={styles.itemControls}>
                <button
                  className={styles.quantityButton}
                  onClick={() => onUpdateQuantity(item.serviceId, item.quantity - 1)}
                >
                  −
                </button>
                <span className={styles.quantity}>{item.quantity}</span>
                <button
                  className={styles.quantityButton}
                  onClick={() => onUpdateQuantity(item.serviceId, item.quantity + 1)}
                >
                  +
                </button>
              </div>

              <div className={styles.itemSubtotal}>{item.subtotal} ₴</div>

              <button
                className={styles.removeButton}
                onClick={() => onRemoveItem(item.serviceId)}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      <div className={styles.totals}>
        <div className={styles.totalRow}>
          <span>Сума:</span>
          <span>{totals.subtotal.toFixed(2)} ₴</span>
        </div>
        <div className={styles.totalRow}>
          <span>ПДВ (10%):</span>
          <span>{totals.tax.toFixed(2)} ₴</span>
        </div>
        <div className={`${styles.totalRow} ${styles.totalAmount}`}>
          <span>Всього:</span>
          <span>{totals.total.toFixed(2)} ₴</span>
        </div>
      </div>

      <div className={styles.paymentButtons}>
        <button
          className={`${styles.paymentButton} ${styles.paymentCash}`}
          onClick={() => onCheckout('cash')}
          disabled={items.length === 0}
        >
          💵 Готівка
        </button>
        <button
          className={`${styles.paymentButton} ${styles.paymentCard}`}
          onClick={() => onCheckout('card')}
          disabled={items.length === 0}
        >
          💳 Карта
        </button>
        <button
          className={`${styles.paymentButton} ${styles.paymentMixed}`}
          onClick={() => onCheckout('mixed')}
          disabled={items.length === 0}
        >
          🔄 Змішано
        </button>
      </div>
    </div>
  );
}
