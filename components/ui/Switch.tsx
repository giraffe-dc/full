"use client";

import React from 'react';
import styles from './Switch.module.css';

export type SwitchSize = 'sm' | 'md' | 'lg';

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
    label?: string;
    size?: SwitchSize;
    helperText?: string;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
    (
        {
            label,
            size = 'md',
            helperText,
            className = '',
            id,
            disabled,
            ...props
        },
        ref
    ) => {
        const switchId = id || `switch-${Math.random().toString(36).substr(2, 9)}`;

        return (
            <div className={`${styles.container} ${className} ${disabled ? styles.disabled : ''}`}>
                <div className={styles.wrapper}>
                    <input
                        ref={ref}
                        type="checkbox"
                        id={switchId}
                        className={`${styles.switch} ${styles[`switch-${size}`]}`}
                        disabled={disabled}
                        {...props}
                    />
                    <label htmlFor={switchId} className={`${styles.toggle} ${styles[`toggle-${size}`]}`}>
                        <span className={`${styles.knob} ${styles[`knob-${size}`]}`} />
                    </label>
                    {label && (
                        <label
                            htmlFor={switchId}
                            className={`${styles.text} ${styles[`text-${size}`]}`}
                        >
                            {label}
                        </label>
                    )}
                </div>

                {helperText && (
                    <p className={styles.helperText}>{helperText}</p>
                )}
            </div>
        );
    }
);

Switch.displayName = 'Switch';

export default Switch;
