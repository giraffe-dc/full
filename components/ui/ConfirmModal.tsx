import React from 'react';
import styles from './ConfirmModal.module.css';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'primary';
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Так',
    cancelText = 'Скасувати',
    type = 'primary'
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <h3 className={styles.title}>{title}</h3>
                <p className={styles.message}>
                    {message}
                </p>
                <div className={styles.actions}>
                    <button className={styles.btnCancel} onClick={onClose}>
                        {cancelText}
                    </button>
                    <button
                        className={`${styles.btnConfirm} ${type === 'danger' ? styles.btnDanger : ''}`}
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
