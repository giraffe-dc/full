"use client";

import { StockSupply } from '../../components/accounting/stock/StockSupply';
import styles from './page.module.css';

export default function SupplyPage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Постачання</h1>
        <p className={styles.subtitle}>Управління постачанням товарів та інгредієнтів</p>
      </div>
      <StockSupply />
    </div>
  );
}
