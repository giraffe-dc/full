"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import styles from './Toast.module.css';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
    success: (message: string) => void;
    error: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);

        setTimeout(() => {
            removeToast(id);
        }, 5000);
    }, [removeToast]);

    const success = (message: string) => showToast(message, 'success');
    const error = (message: string) => showToast(message, 'error');

    return (
        <ToastContext.Provider value={{ showToast, success, error }}>
            {children}
            <div className={styles.container}>
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess :
                                toast.type === 'error' ? styles.toastError : styles.toastInfo
                            }`}
                    >
                        <span className={styles.icon}>
                            {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
                        </span>
                        <div className={styles.content}>
                            <div className={styles.message}>{toast.message}</div>
                        </div>
                        <button className={styles.close} onClick={() => removeToast(toast.id)}>×</button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
