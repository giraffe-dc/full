import React from 'react';
import styles from './Preloader.module.css';

interface PreloaderProps {
    message?: string;
    fullScreen?: boolean;
    variant?: 'light' | 'dark';
}

export const Preloader: React.FC<PreloaderProps> = ({
    message = 'Завантаження...',
    fullScreen = true,
    variant = 'light'
}) => {
    const containerClass = fullScreen ? styles.overlay : styles.inlineContainer;
    const textClass = `${styles.text} ${variant === 'dark' ? styles.darkText : ''}`;

    return (
        <div className={containerClass}>
            <div className={styles.spinner}></div>
            {message && <div className={textClass}>{message}</div>}
        </div>
    );
};
