"use client";

import React from 'react';
import styles from './Button.module.css';

export type ButtonVariant =
    | 'primary'
    | 'secondary'
    | 'success'
    | 'danger'
    | 'warning'
    | 'purple'
    | 'pink'
    | 'rainbow'
    | 'outline'
    | 'ghost';

export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    isLoading?: boolean;
    fullWidth?: boolean;
    icon?: React.ReactNode;
}



export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            children,
            variant = 'primary',
            size = 'md',
            leftIcon,
            rightIcon,
            isLoading = false,
            fullWidth = false,
            className = '',
            disabled,
            ...props
        },
        ref
    ) => {
        const classes = [
            styles.button,
            styles[`button-${variant}`],
            styles[`button-${size}`],
            fullWidth ? styles.buttonFullWidth : '',
            isLoading ? styles.buttonLoading : '',
            className,
        ]
            .filter(Boolean)
            .join(' ');

        return (
            <button
                ref={ref}
                className={classes}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading && (
                    <span className={styles.spinner}>
                        <svg className={styles.spinnerIcon} viewBox="0 0 24 24">
                            <circle
                                className={styles.spinnerCircle}
                                cx="12"
                                cy="12"
                                r="10"
                                fill="none"
                                strokeWidth="3"
                                strokeDasharray="60"
                                strokeDashoffset="0"
                            />
                        </svg>
                    </span>
                )}
                {leftIcon && <span className={styles.icon}>{leftIcon}</span>}
                {children}
                {rightIcon && <span className={styles.icon}>{rightIcon}</span>}
            </button>
        );
    }
);

Button.displayName = 'Button';

export default Button;
