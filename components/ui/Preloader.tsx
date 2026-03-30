import React from 'react';
import styles from './Preloader.module.css';

export type PreloaderVariant = 'yellow' | 'blue' | 'green' | 'purple' | 'pink' | 'orange';
export type PreloaderSize = 'sm' | 'md' | 'lg';

interface PreloaderProps {
    message?: string;
    fullScreen?: boolean;
    variant?: PreloaderVariant;
    size?: PreloaderSize;
    showText?: boolean;
}

export const Preloader: React.FC<PreloaderProps> = ({
    message = 'Завантаження...',
    fullScreen = true,
    variant = 'yellow',
    size = 'md',
    showText = true
}) => {
    const containerClass = fullScreen ? styles.overlay : styles.inlineContainer;

    return (
        <div className={containerClass}>
            <div className={`${styles.spinner} ${styles[`spinner-${variant}`]} ${styles[`spinner-${size}`]}`}></div>
            {showText && message && (
                <div className={styles.text}>{message}</div>
            )}
        </div>
    );
};
