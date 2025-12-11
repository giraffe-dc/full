import React, { useState } from 'react';
import styles from './StockSection.module.css';

interface StockSectionProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function StockSection({ title, subtitle, children }: StockSectionProps) {
  return (
    <section className={styles.card}>
      <div className={styles.headerRow}>
        <div className={styles.titleBlock}>
          <h2 className={styles.title}>{title}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        <div className={styles.toolbarRight}>
          <button className={styles.toolbarButton} type="button">
            📥 Експорт
          </button>
          <button className={styles.toolbarButton} type="button">
            🖨️ Друк
          </button>
          <button
            className={`${styles.toolbarButton} ${styles.buttonPrimary}`}
            type="button"
          >
            ➕ Додати
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {children || (
          <div className={styles.emptyState}>
            <p>Немає даних для відображення</p>
          </div>
        )}
      </div>
    </section>
  );
}
