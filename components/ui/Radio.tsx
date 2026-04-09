"use client";

import React from 'react';
import styles from './Radio.module.css';

export type RadioSize = 'sm' | 'md' | 'lg';

export type RadioProps = React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    size?: RadioSize;
    error?: string;
    helperText?: string;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
    (
        {
            label,
            size = 'md',
            error,
            helperText,
            className = '',
            id,
            disabled,
            children,
            ...props
        },
        ref
    ) => {
        const radioId = id || `radio-${Math.random().toString(36).substr(2, 9)}`;
        const hasLabel = !!(label || children);

        return (
            <div className={`${styles.container} ${className} ${disabled ? styles.disabled : ''}`}>
                <div className={styles.wrapper}>
                    <input
                        ref={ref}
                        type="radio"
                        id={radioId}
                        className={`${styles.radio} ${styles[`radio-${size}`]}`}
                        disabled={disabled}
                        aria-invalid={error ? 'true' : 'false'}
                        {...props}
                    />
                    <label
                        htmlFor={radioId}
                        className={`${styles.label} ${styles[`label-${size}`]} ${error ? styles.labelError : ''}`}
                    />
                    {hasLabel && (
                        <label
                            htmlFor={radioId}
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

Radio.displayName = 'Radio';

export default Radio;
