import React from 'react';
import { Receipt } from '../../types/cash-register';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import styles from './ReceiptModal.module.css';

interface ReceiptModalProps {
  receipt: Receipt | null;
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
}

export function ReceiptModal({ receipt, isOpen, onClose, onPrint }: ReceiptModalProps) {
  if (!receipt) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('uk-UA');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      showCloseButton={true}
    >
      <div className={styles.receiptContent}>
        {/* Receipt Header */}
        <div className={styles.receiptHeader}>
          <div className={styles.receiptTitle}>ЧЕК</div>
          <div className={styles.receiptNumber}>№ {receipt.receiptNumber}</div>
          <div className={styles.receiptDate}>{formatDate(receipt.createdAt)}</div>
        </div>

        {/* Customer Info */}
        {receipt.customerName && (
          <div className={styles.customerSection}>
            <div className={styles.label}>Клієнт:</div>
            <div className={styles.value}>{receipt.customerName}</div>
          </div>
        )}

        {/* Items Table */}
        <div className={styles.itemsSection}>
          <div className={styles.itemsHeader}>
            <div className={styles.itemCol}>Послуга</div>
            <div className={styles.itemColCenter}>Кількість</div>
            <div className={styles.itemColRight}>Ціна</div>
            <div className={styles.itemColRight}>Сума</div>
          </div>

          {receipt.items.map((item, idx) => (
            <div key={idx} className={styles.item}>
              <div className={styles.itemCol}>{item.serviceName}</div>
              <div className={styles.itemColCenter}>{item.quantity}</div>
              <div className={styles.itemColRight}>{item.price.toFixed(2)} ₴</div>
              <div className={styles.itemColRight}>{item.subtotal.toFixed(2)} ₴</div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className={styles.totalsSection}>
          <div className={styles.totalRow}>
            <span>Сума:</span>
            <span>{receipt.subtotal.toFixed(2)} ₴</span>
          </div>
          {receipt.tax > 0 && (
            <div className={styles.totalRow}>
              <span>ПДВ (10%):</span>
              <span>{receipt.tax.toFixed(2)} ₴</span>
            </div>
          )}
          <div className={`${styles.totalRow} ${styles.totalAmount}`}>
            <span>Всього:</span>
            <span>{receipt.total.toFixed(2)} ₴</span>
          </div>
        </div>

        {/* Payment Method */}
        <div className={styles.paymentSection}>
          <div className={styles.paymentBadge}>
            {receipt.paymentMethod === 'cash'
              ? '💵 Готівка'
              : receipt.paymentMethod === 'card'
                ? '💳 Карта'
                : '🔄 Змішано'}
          </div>
        </div>

        {/* Footer Message */}
        <div className={styles.footer}>
          <div className={styles.footerMessage}>Дякуємо за покупку!</div>
          <div className={styles.footerSmall}>Збережіть чек</div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actions}>
          <Button variant="primary" onClick={onPrint} icon={<span>🖨️</span>}>
            Друк
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Закрити
          </Button>
        </div>
      </div>
    </Modal>
  );
}
