import React from 'react';
import { Department, Check } from '../../types/cash-register';
import styles from './DepartmentSelector.module.css';

interface DepartmentSelectorProps {
    departments: Department[];
    onSelect: (dept: Department) => void;
    onAdd?: () => void;
    activeId: string | null;
    orders?: Check[];
}

export function DepartmentSelector({ departments, onSelect, onAdd, activeId, orders = [] }: DepartmentSelectorProps) {
    // Підрахунок відкритих чеків по залах
    const getOpenChecksCount = (deptId: string) => {
        return orders.filter(order => order.departmentId === deptId).length;
    };

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>Оберіть зал</h2>
            <div className={styles.grid}>
                {departments.map(dept => {
                    const checksCount = getOpenChecksCount(dept.id);
                    return (
                        <button
                            key={dept.id}
                            className={styles.card}
                            onClick={() => onSelect(dept)}
                            style={{
                                backgroundColor: activeId === dept.id ? '#4CAF50' : 'transparent',
                                color: activeId === dept.id ? 'white' : 'black',
                                position: 'relative'
                            }}
                        >
                            <div className={styles.icon}>{getIcon(dept.icon)}</div>
                            <div className={styles.name}>{dept.name}</div>
                            {checksCount > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: '8px',
                                    right: '8px',
                                    background: '#ef4444',
                                    color: 'white',
                                    borderRadius: '50%',
                                    width: '24px',
                                    height: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                }}>
                                    {checksCount}
                                </div>
                            )}
                        </button>
                    );
                })}

                {onAdd && (
                    <button className={`${styles.card} ${styles.addCard}`} onClick={onAdd}>
                        <div className={styles.icon}>+</div>
                        <div className={styles.name}>Додати зал</div>
                    </button>
                )}
            </div>
        </div>
    );
}

function getIcon(iconName?: string) {
    switch (iconName) {
        case 'main_hall': return '🍽️';
        case 'terrace': return '🌳';
        case 'vip': return '👑';
        default: return '📍';
    }
}
