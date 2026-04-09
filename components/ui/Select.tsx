"use client";

import React, { useState, useRef, useEffect } from 'react';
import styles from './Select.module.css';

export type SelectSize = 'sm' | 'md' | 'lg';

export interface SelectOption {
    value: string;
    label: string;
    icon?: string;
    disabled?: boolean;
}

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
    label?: string;
    options: SelectOption[];
    placeholder?: string;
    size?: SelectSize;
    error?: string;
    helperText?: string;
    leftIcon?: React.ReactNode;
    clearable?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    (
        {
            label,
            options,
            placeholder = 'Оберіть...',
            size = 'md',
            error,
            helperText,
            leftIcon,
            clearable = false,
            className = '',
            value,
            onChange,
            disabled,
            ...props
        },
        ref
    ) => {
        const [isOpen, setIsOpen] = useState(false);
        const [selectedLabel, setSelectedLabel] = useState<string>('');
        const selectRef = useRef<HTMLDivElement>(null);

        // Find selected option label
        useEffect(() => {
            const selected = options.find(opt => opt.value === value);
            setSelectedLabel(selected ? selected.label : '');
        }, [value, options]);

        // Close dropdown when clicking outside
        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
                    setIsOpen(false);
                }
            };

            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, []);

        const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
            const selectedValue = e.target.value;
            const selectedOption = options.find(opt => opt.value === selectedValue);
            setSelectedLabel(selectedOption ? selectedOption.label : '');
            onChange?.(e);
            setIsOpen(false);
        };

        const handleClear = (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const fakeEvent = {
                target: { value: '' }
            } as unknown as React.ChangeEvent<HTMLSelectElement>;
            onChange?.(fakeEvent);
            setSelectedLabel('');
        };

        const hasValue = value !== '' && value !== undefined && value !== null;

        return (
            <div className={`${styles.container} ${className}`} ref={selectRef}>
                {label && (
                    <label className={styles.label}>
                        {label}
                    </label>
                )}

                <div className={`${styles.selectWrapper} ${styles[`selectWrapper-${size}`]} ${error ? styles.selectWrapperError : ''}`}>
                    {leftIcon && (
                        <span className={styles.leftIcon}>{leftIcon}</span>
                    )}

                    <select
                        ref={ref}
                        value={value}
                        onChange={handleSelectChange}
                        disabled={disabled}
                        className={`${styles.select} ${styles[`select-${size}`]} ${leftIcon ? styles.selectWithIcon : ''}`}
                        aria-invalid={error ? 'true' : 'false'}
                        {...props}
                    >
                        <option value="">{placeholder}</option>
                        {options.map((option) => (
                            <option
                                key={option.value}
                                value={option.value}
                                disabled={option.disabled}
                            >
                                {option.icon && `${option.icon} `}{option.label}
                            </option>
                        ))}
                    </select>

                    {clearable && hasValue && (
                        <button
                            type="button"
                            className={styles.clearButton}
                            onClick={handleClear}
                            aria-label="Clear selection"
                        >
                            ✕
                        </button>
                    )}

                    <span className={styles.chevron}>
                        {isOpen ? '↑' : '↓'}
                    </span>
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

Select.displayName = 'Select';

export default Select;
