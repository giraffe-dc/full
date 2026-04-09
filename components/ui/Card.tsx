"use client";

import React from 'react';
import styles from './Card.module.css';

export type CardVariant =
    | 'default'
    | 'rainbow'
    | 'glass'
    | 'hover'
    | 'outline'
    | 'interactive';

export type CardColor =
    | 'yellow'
    | 'blue'
    | 'green'
    | 'purple'
    | 'pink'
    | 'orange'
    | 'gray';

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
    variant?: CardVariant;
    color?: CardColor;
    padding?: 'sm' | 'md' | 'lg';
    noPadding?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
    (
        {
            children,
            variant = 'default',
            color,
            padding = 'md',
            noPadding = false,
            className = '',
            ...props
        },
        ref
    ) => {
        const classes = [
            styles.card,
            styles[`card-${variant}`],
            color ? styles[`card-${color}`] : '',
            noPadding ? styles.cardNoPadding : styles[`card-padding-${padding}`],
            className,
        ]
            .filter(Boolean)
            .join(' ');

        return (
            <div
                ref={ref}
                className={classes}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Card.displayName = 'Card';

export default Card;
