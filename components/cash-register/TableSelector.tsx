import React from 'react';
import { Table, Check } from '../../types/cash-register';
import styles from './TableSelector.module.css';

interface TableSelectorProps {
    tables: Table[];
    onSelect: (table: Table) => void;
    onBack: () => void;
    departmentName: string;
    onAdd?: () => void;
    orders?: Check[];
}

export function TableSelector({ tables, onSelect, onBack, departmentName, onAdd, orders = [] }: TableSelectorProps) {
    // Знайти коментар для столу
    const getTableComment = (tableId: string) => {
        const check = orders.find(order => order.tableId === tableId);
        if (check && check.comment) {
            return check.comment.substring(0, 10) + (check.comment.length > 10 ? '...' : '');
        }
        return null;
    };

    // Перевірити чи є передплата по столу
    const hasDeposit = (tableId: string) => {
        const check = orders.find(order => order.tableId === tableId);
        return check && (check.paidAmount || 0) > 0;
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button onClick={onBack} className={styles.backButton}>← Назад</button>
                <h2 className={styles.title}>{departmentName}</h2>
            </div>

            <div className={styles.grid}>
                {tables.map(table => {
                    const comment = getTableComment(table.id);
                    return (
                        <button
                            key={table.id}
                            className={`${styles.card} ${styles[table.status]}`}
                            onClick={() => onSelect(table)}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '0 8px' }}>
                                <div className={styles.tableNumber}>{table.name}</div>
                                {hasDeposit(table.id) && (
                                    <div style={{ fontSize: '1.2rem', marginTop: '2px' }} title="Є передплата">💰</div>
                                )}
                            </div>
                            <div className={styles.seats}>👥 {table.seats}</div>
                            {comment && (
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: '#6b7280',
                                    marginTop: '4px',
                                    fontStyle: 'italic',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {comment}
                                </div>
                            )}
                            <div className={styles.statusLabel}>
                                {table.status === 'free' ? 'Вільний' : table.status === 'busy' ? 'Зайнятий' : 'Резерв'}
                            </div>
                        </button>
                    );
                })}

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
