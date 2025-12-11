import React from 'react';
import Link from 'next/link';
import styles from './CashRegisterNav.module.css';

export function CashRegisterNav() {
  return (
    <nav className={styles.nav}>
      <div className={styles.navContainer}>
        <Link href="/cash-register" className={styles.navLink}>
          🏪 Каса
        </Link>
        <Link href="/cash-register/reports" className={styles.navLink}>
          📊 Звіти
        </Link>
        <Link href="/accounting" className={styles.navLink}>
          📈 Бухгалтерія
        </Link>
      </div>
    </nav>
  );
}
