import React from 'react';
import { Receipt } from '../../types/cash-register';
import styles from './ReceiptModal.module.css';

interface ReceiptModalProps {
  receipt: Receipt;
  onClose: () => void;
  onPrint: () => void;
}

export function ReceiptModal({ receipt, onClose, onPrint }: ReceiptModalProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('uk-UA');
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Чек #{receipt.receiptNumber}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.receiptContent}>
          <div className={styles.receiptHeader}>
            <div className={styles.receiptTitle}>ЧЕК</div>
            <div className={styles.receiptNumber}>№ {receipt.receiptNumber}</div>
            <div className={styles.receiptDate}>{formatDate(receipt.createdAt)}</div>
          </div>

          {receipt.customerName && (
            <div className={styles.customerSection}>
              <div className={styles.label}>Клієнт:</div>
              <div className={styles.value}>{receipt.customerName}</div>
            </div>
          )}

          <div className={styles.itemsSection}>
            <div className={styles.itemsHeader}>
              <div className={styles.itemCol}>Послуга</div>
              <div className={styles.itemCol}>Кількість</div>
              <div className={styles.itemCol}>Ціна</div>
              <div className={styles.itemCol}>Сума</div>
            </div>

            {receipt.items.map((item) => (
              <div key={item.serviceId} className={styles.item}>
                <div className={styles.itemCol}>{item.serviceName}</div>
                <div className={styles.itemCol}>{item.quantity}</div>
                <div className={styles.itemCol}>{item.price} ₴</div>
                <div className={styles.itemCol}>{item.subtotal} ₴</div>
              </div>
            ))}
          </div>

          <div className={styles.totalsSection}>
            <div className={styles.totalRow}>
              <span>Сума:</span>
              <span>{receipt.subtotal.toFixed(2)} ₴</span>
            </div>
            <div className={styles.totalRow}>
              <span>ПДВ (10%):</span>
              <span>{receipt.tax.toFixed(2)} ₴</span>
            </div>
            <div className={`${styles.totalRow} ${styles.totalAmount}`}>
              <span>Всього:</span>
              <span>{receipt.total.toFixed(2)} ₴</span>
            </div>
          </div>

          <div className={styles.paymentSection}>
            <div className={styles.label}>Спосіб оплати:</div>
            <div className={styles.value}>
              {receipt.paymentMethod === 'cash'
                ? '💵 Готівка'
                : receipt.paymentMethod === 'card'
                ? '💳 Карта'
                : '🔄 Змішано'}
            </div>
          </div>

          <div className={styles.footer}>
            <div>Дякуємо за покупку!</div>
            <div className={styles.footerSmall}>Збережіть чек</div>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.buttonPrint} onClick={onPrint}>
            🖨️ Друк
          </button>
          <button className={styles.buttonClose} onClick={onClose}>
            Закрити
          </button>
        </div>
      </div>
    </div>
  );
}
