import React from 'react';
import { Department } from '../../types/cash-register';
import styles from './DepartmentSelector.module.css';

interface DepartmentSelectorProps {
    departments: Department[];
    onSelect: (dept: Department) => void;
    onAdd?: () => void;
    activeId: string | null
}

export function DepartmentSelector({ departments, onSelect, onAdd, activeId }: DepartmentSelectorProps) {
    return (
        <div className={styles.container}>
            <h2 className={styles.title}>Оберіть зал</h2>
            <div className={styles.grid}>
                {departments.map(dept => (
                    <button
                        key={dept.id}
                        className={styles.card}
                        onClick={() => onSelect(dept)}
                        style={{
                            backgroundColor: activeId === dept.id ? '#4CAF50' : 'transparent',
                            color: activeId === dept.id ? 'white' : 'black'
                        }}
                    >
                        <div className={styles.icon}>{getIcon(dept.icon)}</div>
                        <div className={styles.name}>{dept.name}</div>
                    </button>
                ))}

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
