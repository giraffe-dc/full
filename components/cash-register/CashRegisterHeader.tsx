import React from 'react';
import styles from './CashRegisterHeader.module.css';

interface CashRegisterHeaderProps {
  shiftNumber?: number;
  isOpen: boolean;
  onOpenShift: () => void;
  onCloseShift: () => void;
}

export function CashRegisterHeader({
  shiftNumber,
  isOpen,
  onOpenShift,
  onCloseShift,
}: CashRegisterHeaderProps) {
  const currentTime = new Date().toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <h1 className={styles.title}>Касовий реєстр</h1>
        <div className={styles.shiftInfo}>
          {isOpen ? (
            <>
              <span className={`${styles.status} ${styles.statusOpen}`}>
                ● Каса відкрита
              </span>
              <span className={styles.shiftNumber}>Зміна #{shiftNumber}</span>
            </>
          ) : (
            <span className={`${styles.status} ${styles.statusClosed}`}>
              ● Каса закрита
            </span>
          )}
        </div>
      </div>

      <div className={styles.headerCenter}>
        <div className={styles.time}>{currentTime}</div>
      </div>

      <div className={styles.headerRight}>
        {isOpen ? (
          <button
            className={`${styles.button} ${styles.buttonDanger}`}
            onClick={onCloseShift}
          >
            Закрити касу
          </button>
        ) : (
          <button
            className={`${styles.button} ${styles.buttonSuccess}`}
            onClick={onOpenShift}
          >
            Відкрити касу
          </button>
        )}
      </div>
    </header>
  );
}
