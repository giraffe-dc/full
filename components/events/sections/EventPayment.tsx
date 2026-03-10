"use client";

import { EventFormData } from '../EventFormModal.types';
import { PaymentStatus } from '@/types/events';
import styles from '../EventFormModal.module.css';

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Не оплачено',
  deposit: 'Депозит',
  paid: 'Оплачено',
  refunded: 'Повернено',
};

interface EventPaymentProps {
  formData: EventFormData;
  onUpdateField: (field: keyof EventFormData, value: any) => void;
}

export function EventPayment({ formData, onUpdateField }: EventPaymentProps) {
  const remaining = formData.total - formData.paidAmount;

  return (
    <div className={styles.formGrid}>
      {/* Знижка */}
      <div className={styles.formGroup}>
        <label>Знижка (₴)</label>
        <input
          type="number"
          value={formData.discount}
          onChange={(e) => onUpdateField('discount', parseFloat(e.target.value) || 0)}
          className={styles.input}
          min="0"
          step="0.01"
        />
      </div>

      <div className={styles.formGroup}>
        <label>Причина знижки</label>
        <input
          type="text"
          value={formData.discountReason}
          onChange={(e) => onUpdateField('discountReason', e.target.value)}
          className={styles.input}
          placeholder="Наприклад: Постійний клієнт"
        />
      </div>

      {/* Підсумок */}
      <div className={styles.formGroupFull}>
        <div className={styles.paymentSummary}>
          <div className={styles.summaryRow}>
            <span>Підсумок:</span>
            <span>{formData.subtotal.toFixed(2)} ₴</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Знижка:</span>
            <span className={styles.discount}>-{formData.discount.toFixed(2)} ₴</span>
          </div>
          <div className={`${styles.summaryRow} ${styles.total}`}>
            <span>ДО СПЛАТИ:</span>
            <span>{formData.total.toFixed(2)} ₴</span>
          </div>
        </div>
      </div>

      {/* Оплата */}
      <div className={styles.formGroup}>
        <label>Сплачено</label>
        <input
          type="number"
          value={formData.paidAmount}
          onChange={(e) => onUpdateField('paidAmount', parseFloat(e.target.value) || 0)}
          className={styles.input}
          min="0"
          step="0.01"
        />
      </div>

      <div className={styles.formGroup}>
        <label>Статус оплати</label>
        <select
          value={formData.paymentStatus}
          onChange={(e) => onUpdateField('paymentStatus', e.target.value)}
          className={styles.select}
        >
          {(Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[]).map(status => (
            <option key={status} value={status}>{PAYMENT_STATUS_LABELS[status]}</option>
          ))}
        </select>
      </div>

      <div className={styles.formGroupFull}>
        <div className={styles.paymentStatus}>
          <span>До сплати:</span>
          <span className={remaining > 0 ? styles.due : styles.paid}>
            {remaining.toFixed(2)} ₴
          </span>
        </div>
      </div>
    </div>
  );
}
