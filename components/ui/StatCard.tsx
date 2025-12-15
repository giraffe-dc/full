import React from 'react';
import styles from './StatCard.module.css';

export interface StatCardProps {
    title: string;
    value: string | number;
    icon?: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
    onClick?: () => void;
}

export function StatCard({
    title,
    value,
    icon,
    trend,
    color = 'primary',
    onClick,
}: StatCardProps) {
    return (
        <div
            className={`${styles.card} ${styles[color]} ${onClick ? styles.clickable : ''}`}
            onClick={onClick}
        >
            <div className={styles.header}>
                <div className={styles.title}>{title}</div>
                {icon && <div className={styles.icon}>{icon}</div>}
            </div>

            <div className={styles.value}>{value}</div>

            {trend && (
                <div className={`${styles.trend} ${trend.isPositive ? styles.trendPositive : styles.trendNegative}`}>
                    <span className={styles.trendIcon}>{trend.isPositive ? '↗' : '↘'}</span>
                    <span className={styles.trendValue}>{Math.abs(trend.value)}%</span>
                </div>
            )}
        </div>
    );
}
