"use client";

import React from 'react';
import styles from './Textarea.module.css';

export type TextareaVariant = 'default' | 'success' | 'error' | 'warning';
export type TextareaSize = 'sm' | 'md' | 'lg';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label?: string;
    error?: string;
    variant?: TextareaVariant;
    size?: TextareaSize;
    helperText?: string;
    resize?: 'none' | 'vertical' | 'horizontal' | 'both';
    maxLength?: number;
    showCharCount?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    (
        {
            label,
            error,
            variant = 'default',
            size = 'md',
            helperText,
            resize = 'vertical',
            maxLength,
            showCharCount = false,
            className = '',
            value,
            disabled,
            ...props
        },
        ref
    ) => {
        const currentValue = (value ?? '') as string;
        const charCount = currentValue.length;
        const hasMax = maxLength !== undefined;

        return (
            <div className={`${styles.container} ${className}`}>
                {label && (
                    <label className={styles.label}>
                        {label}
                    </label>
                )}

                <div className={`${styles.textareaWrapper} ${styles[`textareaWrapper-${variant}`]}`}>
                    <textarea
                        ref={ref}
                        className={`${styles.textarea} ${styles[`textarea-${size}`]} ${styles[`textarea-resize-${resize}`]} ${disabled ? styles.textareaDisabled : ''}`}
                        disabled={disabled}
                        maxLength={maxLength}
                        aria-invalid={variant === 'error' ? 'true' : 'false'}
                        {...props}
                    />
                </div>

                {(error || helperText || (showCharCount && hasMax)) && (
                    <div className={styles.footer}>
                        {(error || helperText) && (
                            <p className={`${styles.helperText} ${error ? styles.helperTextError : ''}`}>
                                {error || helperText}
                            </p>
                        )}
                        {showCharCount && hasMax && (
                            <span className={`${styles.charCount} ${charCount > maxLength * 0.9 ? styles.charCountWarning : ''}`}>
                                {charCount}/{maxLength}
                            </span>
                        )}
                    </div>
                )}
            </div>
        );
    }
);

Textarea.displayName = 'Textarea';

export default Textarea;
