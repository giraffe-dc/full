import React from 'react';
import Link from 'next/link';
import styles from './CashRegisterNav.module.css';

export function CashRegisterNav({ setShowStaffModal, activeStaffIds }: { setShowStaffModal: (show: boolean) => void, activeStaffIds: string[] }) {
  return (
    <nav className={styles.nav}>
      <div className={styles.navContainer}>
        {/* <Link href="/cash-register" className={styles.navLink}>
          🏪 Каса
        </Link> */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',  padding: '0 1rem' }}>
          <Link href="/cash-register/reports" className={styles.navLink} style={{
            background: 'white', border: '1px solid #e5e7eb', padding: '8px 16px',
            borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#374151',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            📊 Звіти
          </Link></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',  padding: '0 1rem' }}>
          <div>{/* Empty or breadcrumbs */}</div>
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
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',  padding: '0 1rem' }}>
          <div>{/* Empty or breadcrumbs */}</div>
          <button
            onClick={() => setShowStaffModal(true)}
            style={{
              background: 'white', border: '1px solid #e5e7eb', padding: '8px 16px',
              borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#374151',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            👥 Акції: {activeStaffIds.length}
          </button>
        </div>
      </div>
    </nav>
  );
}
