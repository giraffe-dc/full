"use client";

import React from 'react';
import styles from './Input.module.css';

export type InputVariant = 'default' | 'success' | 'error' | 'warning';
export type InputSize = 'sm' | 'md' | 'lg';

export type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
    label?: string;
    error?: string;
    variant?: InputVariant;
    size?: InputSize;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    (
        {
            label,
            error,
            variant = 'default',
            size = 'md',
            leftIcon,
            rightIcon,
            helperText,
            className = '',
            id,
            disabled,
            ...props
        },
        ref
    ) => {
        const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

        const classes = [
            styles.container,
            styles[`container-${variant}`],
            className,
        ]
            .filter(Boolean)
            .join(' ');

        return (
            <div className={classes}>
                {label && (
                    <label htmlFor={inputId} className={styles.label}>
                        {label}
                    </label>
                )}

                <div className={`${styles.inputWrapper} ${styles[`inputWrapper-${variant}`]}`}>
                    {leftIcon && (
                        <span className={`${styles.icon} ${styles.leftIcon}`}>
                            {leftIcon}
                        </span>
                    )}

                    <input
                        ref={ref}
                        id={inputId}
                        className={`${styles.input} ${styles[`input-${size}`]} ${disabled ? styles.inputDisabled : ''}`}
                        disabled={disabled}
                        aria-invalid={variant === 'error' ? 'true' : 'false'}
                        {...props}
                    />

                    {rightIcon && (
                        <span className={`${styles.icon} ${styles.rightIcon}`}>
                            {rightIcon}
                        </span>
                    )}
                </div>

                {(error || helperText) && (
                    <p className={`${styles.helperText} ${error ? styles.helperTextError : ''}`}>
                        {error || helperText}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

export default Input;
