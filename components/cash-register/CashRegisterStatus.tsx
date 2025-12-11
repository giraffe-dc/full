import React from 'react';
import styles from './CashRegisterStatus.module.css';

interface CashRegisterStatusProps {
  currentBalance: number;
  receiptsCount: number;
  isOpen: boolean;
}

export function CashRegisterStatus({
  currentBalance,
  receiptsCount,
  isOpen,
}: CashRegisterStatusProps) {
  return (
    <div className={styles.container}>
      <div className={styles.statusCard}>
        <div className={styles.label}>Поточний баланс</div>
        <div className={`${styles.value} ${currentBalance >= 0 ? styles.positive : styles.negative}`}>
          {currentBalance.toFixed(2)} ₴
        </div>
      </div>

      <div className={styles.statusCard}>
        <div className={styles.label}>Чеків створено</div>
        <div className={styles.value}>{receiptsCount}</div>
      </div>

      <div className={styles.statusCard}>
        <div className={styles.label}>Статус каси</div>
        <div className={`${styles.status} ${isOpen ? styles.statusOpen : styles.statusClosed}`}>
          {isOpen ? '● Відкрита' : '● Закрита'}
        </div>
      </div>
    </div>
  );
}
