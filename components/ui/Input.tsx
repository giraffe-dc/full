import React, { forwardRef } from 'react';
import styles from './Input.module.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
    fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, helperText, fullWidth, className = '', ...props }, ref) => {
        return (
            <div className={`${styles.wrapper} ${fullWidth ? styles.fullWidth : ''}`}>
                {label && (
                    <label className={styles.label} htmlFor={props.id}>
                        {label}
                        {props.required && <span className={styles.required}>*</span>}
                    </label>
                )}

                <input
                    ref={ref}
                    className={`${styles.input} ${error ? styles.inputError : ''} ${className}`}
                    {...props}
                />

                {error && <div className={styles.error}>{error}</div>}
                {helperText && !error && <div className={styles.helperText}>{helperText}</div>}
            </div>
        );
    }
);

Input.displayName = 'Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    helperText?: string;
    fullWidth?: boolean;
    children: React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, error, helperText, fullWidth, className = '', children, ...props }, ref) => {
        return (
            <div className={`${styles.wrapper} ${fullWidth ? styles.fullWidth : ''}`}>
                {label && (
                    <label className={styles.label} htmlFor={props.id}>
                        {label}
                        {props.required && <span className={styles.required}>*</span>}
                    </label>
                )}

                <select
                    ref={ref}
                    className={`${styles.select} ${error ? styles.inputError : ''} ${className}`}
                    {...props}
                >
                    {children}
                </select>

                {error && <div className={styles.error}>{error}</div>}
                {helperText && !error && <div className={styles.helperText}>{helperText}</div>}
            </div>
        );
    }
);

Select.displayName = 'Select';
