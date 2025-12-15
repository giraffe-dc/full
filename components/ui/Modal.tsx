import React, { useEffect } from 'react';
import styles from './Modal.module.css';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showCloseButton?: boolean;
    footer?: React.ReactNode;
}

export function Modal({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showCloseButton = true,
    footer,
}: ModalProps) {
    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div
                className={`${styles.modal} ${styles[size]}`}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? 'modal-title' : undefined}
            >
                {(title || showCloseButton) && (
                    <div className={styles.header}>
                        {title && (
                            <h2 id="modal-title" className={styles.title}>
                                {title}
                            </h2>
                        )}
                        {showCloseButton && (
                            <button
                                className={styles.closeButton}
                                onClick={onClose}
                                aria-label="Close modal"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                )}

                <div className={styles.body}>{children}</div>

                {footer && <div className={styles.footer}>{footer}</div>}
            </div>
        </div>
    );
}

export function ModalHeader({ children }: { children: React.ReactNode }) {
    return <div className={styles.customHeader}>{children}</div>;
}

export function ModalBody({ children }: { children: React.ReactNode }) {
    return <div className={styles.customBody}>{children}</div>;
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
    return <div className={styles.customFooter}>{children}</div>;
}
