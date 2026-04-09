"use client";

import React, { useState, useRef, useEffect } from 'react';
import styles from './Tooltip.module.css';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';
export type TooltipVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

export type TooltipProps = {
    content: string;
    children: React.ReactNode;
    position?: TooltipPosition;
    variant?: TooltipVariant;
    delay?: number;
    className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
    content,
    children,
    position = 'top',
    variant = 'default',
    delay = 200,
    className = '',
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const triggerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsMounted(true);
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const showTooltip = () => {
        timeoutRef.current = setTimeout(() => {
            setIsVisible(true);
        }, delay);
    };

    const hideTooltip = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsVisible(false);
    };

    if (!isMounted) {
        return <>{children}</>;
    }

    return (
        <div className={`${styles.wrapper} ${className}`} ref={triggerRef}>
            <div
                className={styles.trigger}
                onMouseEnter={showTooltip}
                onMouseLeave={hideTooltip}
                onFocus={showTooltip}
                onBlur={hideTooltip}
            >
                {children}
            </div>

            {isVisible && (
                <div
                    className={`${styles.tooltip} ${styles[`tooltip-${position}`]} ${styles[`tooltip-${variant}`]}`}
                    role="tooltip"
                >
                    {content}
                    <span className={`${styles.arrow} ${styles[`arrow-${position}`]}`} />
                </div>
            )}
        </div>
    );
};

export default Tooltip;
