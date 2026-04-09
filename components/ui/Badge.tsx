"use client";

import React from 'react';
import styles from './Badge.module.css';

export type BadgeVariant =
    | 'default'
    | 'success'
    | 'error'
    | 'warning'
    | 'info'
    | 'purple'
    | 'pink'
    | 'blue'
    | 'yellow'
    | 'outline'
    | 'dot'
    | 'gradient';

export type BadgeSize = 'sm' | 'md' | 'lg';

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
    variant?: BadgeVariant;
    size?: BadgeSize;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
    (
        {
            children,
            variant = 'default',
            size = 'md',
            leftIcon,
            rightIcon,
            className = '',
            ...props
        },
        ref
    ) => {
        const classes = [
            styles.badge,
            styles[`badge-${variant}`],
            styles[`badge-${size}`],
            className,
        ]
            .filter(Boolean)
            .join(' ');

        return (
            <span
                ref={ref}
                className={classes}
                {...props}
            >
                {variant === 'dot' && leftIcon && (
                    <span className={styles.dotIcon}>{leftIcon}</span>
                )}
                {variant !== 'dot' && leftIcon && (
                    <span className={styles.icon}>{leftIcon}</span>
                )}
                {children}
                {rightIcon && <span className={styles.icon}>{rightIcon}</span>}
            </span>
        );
    }
);

Badge.displayName = 'Badge';

export default Badge;
