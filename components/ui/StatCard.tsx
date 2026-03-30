import React from 'react';
import styles from './StatCard.module.css';

export type StatCardColor = 'yellow' | 'blue' | 'green' | 'purple' | 'pink' | 'orange';

export interface StatCardProps {
    title: string;
    value: string | number;
    icon?: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    color?: StatCardColor;
    onClick?: () => void;
    className?: string;
}

export function StatCard({
    title,
    value,
    icon,
    trend,
    color = 'yellow',
    onClick,
    className = '',
}: StatCardProps) {
    return (
        <div
            className={`${styles.card} ${styles[`card-${color}`]} ${onClick ? styles.clickable : ''} ${className}`}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={onClick ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            } : undefined}
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
