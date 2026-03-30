"use client";

import React from 'react';
import styles from './Avatar.module.css';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarVariant = 'solid' | 'outline' | 'gradient';

interface AvatarProps {
    src?: string;
    alt?: string;
    name?: string;
    size?: AvatarSize;
    variant?: AvatarVariant;
    status?: 'online' | 'offline' | 'away' | 'busy';
    className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
    src,
    alt = 'Avatar',
    name,
    size = 'md',
    variant = 'solid',
    status,
    className = '',
}) => {
    // Get initials from name
    const initials = name
        ? name
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
        : '?';

    const classes = [
        styles.avatar,
        styles[`avatar-${size}`],
        styles[`avatar-${variant}`],
        status ? styles[`status-${status}`] : '',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={classes}>
            {src ? (
                <img src={src} alt={alt} className={styles.image} />
            ) : (
                <span className={styles.initials}>{initials}</span>
            )}

            {status && (
                <span className={`${styles.statusIndicator} ${styles[`status-${status}`]}`} />
            )}
        </div>
    );
};

export default Avatar;
