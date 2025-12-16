import React from 'react';
import { Table } from '../../types/cash-register';
import styles from './TableSelector.module.css';

interface TableSelectorProps {
    tables: Table[];
    onSelect: (table: Table) => void;
    onBack: () => void;
    departmentName: string;
    onAdd?: () => void;
}

export function TableSelector({ tables, onSelect, onBack, departmentName, onAdd }: TableSelectorProps) {
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button onClick={onBack} className={styles.backButton}>← Назад</button>
                <h2 className={styles.title}>{departmentName}</h2>
            </div>

            <div className={styles.grid}>
                {tables.map(table => (
                    <button
                        key={table.id}
                        className={`${styles.card} ${styles[table.status]}`}
                        onClick={() => onSelect(table)}
                    >
                        <div className={styles.tableNumber}>{table.name}</div>
                        <div className={styles.seats}>👥 {table.seats}</div>
                        <div className={styles.statusLabel}>
                            {table.status === 'free' ? 'Вільний' : table.status === 'busy' ? 'Зайнятий' : 'Резерв'}
                        </div>
                    </button>
                ))}

                {onAdd && (
                    <button className={`${styles.card} ${styles.addCard}`} onClick={onAdd}>
                        <div className={styles.tableNumber}>+</div>
                        <div className={styles.statusLabel}>Додати стіл</div>
                    </button>
                )}
            </div>
        </div>
    );
}
