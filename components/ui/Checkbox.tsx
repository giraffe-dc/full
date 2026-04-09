"use client";

import React from 'react';
import styles from './Checkbox.module.css';

export type CheckboxSize = 'sm' | 'md' | 'lg';

export type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    size?: CheckboxSize;
    error?: string;
    helperText?: string;
    indeterminate?: boolean;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    (
        {
            label,
            size = 'md',
            error,
            helperText,
            indeterminate = false,
            className = '',
            id,
            disabled,
            children,
            ...props
        },
        ref
    ) => {
        const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
        const hasLabel = !!(label || children);

        return (
            <div className={`${styles.container} ${className} ${disabled ? styles.disabled : ''}`}>
                <div className={styles.wrapper}>
                    <input
                        ref={ref}
                        type="checkbox"
                        id={checkboxId}
                        className={`${styles.checkbox} ${styles[`checkbox-${size}`]}`}
                        disabled={disabled}
                        aria-invalid={error ? 'true' : 'false'}
                        {...props}
                    />
                    <label
                        htmlFor={checkboxId}
                        className={`${styles.label} ${styles[`label-${size}`]} ${error ? styles.labelError : ''}`}
                    >
                        {indeterminate && (
                            <span className={styles.indeterminateIcon}>−</span>
                        )}
                    </label>
                    {hasLabel && (
                        <label
                            htmlFor={checkboxId}
                            className={`${styles.text} ${styles[`text-${size}`]} ${error ? styles.textError : ''}`}
                        >
                            {label || children}
                        </label>
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

Checkbox.displayName = 'Checkbox';

export default Checkbox;
