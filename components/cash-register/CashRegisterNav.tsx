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
        {/* <Link href="/cash-register" className={styles.navLink}>
          🏪 Каса
        </Link> */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1rem', width: '100%' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link href="/cash-register/reports" className={styles.navLink} style={{
              background: 'white', border: '1px solid #e5e7eb', padding: '8px 16px',
              borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#374151',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              📊 Звіти
            </Link>
            {isShiftOpen && (
              <>
                <button
                  onClick={() => onCashOperation?.('income')}
                  style={{
                    background: '#ecfccb', border: '1px solid #d9f99d', padding: '8px 16px',
                    borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#3f6212',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                  title="Внесення коштів"
                >
                  ➕ Прихід
                </button>
                <button
                  onClick={() => onCashOperation?.('expense')}
                  style={{
                    background: '#ffe4e6', border: '1px solid #fda4af', padding: '8px 16px',
                    borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#9f1239',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                  title="Витрати"
                >
                  ➖ Витрати
                </button>
                <button
                  onClick={() => onCashOperation?.('incasation')}
                  style={{
                    background: '#fae8ff', border: '1px solid #f0abfc', padding: '8px 16px',
                    borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#86198f',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                  title="Інкасація"
                >
                  🏦 Інкасація
                </button>

                <button
                  onClick={onCloseShift}
                  style={{
                    background: '#fee2e2', border: '1px solid #fca5a5', padding: '8px 16px',
                    borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#b91c1c',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                >
                  🛑 Закрити зміну
                </button>
              </>
            )}
            {!isShiftOpen && (
              <button
                onClick={onOpenShift}
                style={{
                  background: '#dcfce7', border: '1px solid #86efac', padding: '8px 16px',
                  borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#166534',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                🟢 Відкрити зміну
              </button>
            )}
          </div>

          {isShiftOpen && (
            <button
              onClick={() => setShowStaffModal(true)}
              style={{
                background: 'white', border: '1px solid #e5e7eb', padding: '8px 16px',
                borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#374151',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              👥 Зміна: {activeStaffIds.length}
            </button>
          )}
        </div>

      </div>
    </nav>
  );
}
