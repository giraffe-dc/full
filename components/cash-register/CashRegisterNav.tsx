import React from 'react';
import Link from 'next/link';
import styles from './CashRegisterNav.module.css';

export function CashRegisterNav({
  setShowStaffModal,
  activeStaffIds,
  onShowPromotions,
  isShiftOpen,
  onOpenShift,
  onCloseShift,
  onCashOperation
}: {
  setShowStaffModal: (show: boolean) => void,
  activeStaffIds: string[],
  onShowPromotions?: () => void,
  isShiftOpen: boolean,
  onOpenShift: () => void,
  onCloseShift: () => void,
  onCashOperation?: (type: 'income' | 'expense' | 'incasation') => void
}) {
  return (
    <nav className={styles.nav}>
      <div className={styles.navContainer}>

        <div className={styles.controlsGroup}>
          <Link href="/cash-register/reports" className={`${styles.navButton} ${styles.reportsBtn}`}>
            📊 <span>Звіти</span>
          </Link>

          {isShiftOpen && (
            <>
              <button
                onClick={() => onCashOperation?.('income')}
                className={`${styles.navButton} ${styles.incomeBtn}`}
                title="Внесення коштів"
              >
                ➕ <span>Прихід</span>
              </button>

              <button
                onClick={() => onCashOperation?.('expense')}
                className={`${styles.navButton} ${styles.expenseBtn}`}
                title="Витрати"
              >
                ➖ <span>Витрати</span>
              </button>

              <button
                onClick={() => onCashOperation?.('incasation')}
                className={`${styles.navButton} ${styles.incasationBtn}`}
                title="Інкасація"
              >
                🏦 <span>Інкасація</span>
              </button>

              <button
                onClick={onCloseShift}
                className={`${styles.navButton} ${styles.closeShiftBtn}`}
                title="Закрити зміну"
              >
                🛑 <span>Закрити зміну</span>
              </button>
            </>
          )}

          {!isShiftOpen && (
            <button
              onClick={onOpenShift}
              className={`${styles.navButton} ${styles.openShiftBtn}`}
            >
              🟢 <span>Відкрити зміну</span>
            </button>
          )}
        </div>

        {isShiftOpen && (
          <button
            onClick={() => setShowStaffModal(true)}
            className={`${styles.navButton} ${styles.staffBtn}`}
          >
            👥 <span>Зміна: {activeStaffIds.length}</span>
          </button>
        )}

      </div>
    </nav>
  );
}
