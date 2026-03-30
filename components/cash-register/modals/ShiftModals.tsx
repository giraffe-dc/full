"use client";

import { useState, useEffect } from 'react';
import { Modal, Button, Input } from '@/components/ui';
import { useToast } from '@/components/ui/ToastContext';
import { formatCurrency } from '@/utils/format';
import styles from './ShiftModals.module.css';

interface ShiftModalsProps {
    showOpenShiftModal: boolean;
    showCloseShiftModal: boolean;
    onCloseOpenShift: () => void;
    onCloseCloseShift: () => void;
    onOpenShift: (balance: number, cashierId: string) => Promise<void>;
    onCloseShift: (endBalance: number) => Promise<void>;
    staff: any[];
    closingData: {
        startBalance: number;
        totalSales: number;
        totalSalesCash: number;
        totalSalesCard: number;
        totalExpenses: number;
        totalIncome: number;
        totalIncasation: number;
        expectedBalance: number;
    } | null;
    lastShiftEndBalance: string;
}

export const ShiftModals = ({
    showOpenShiftModal,
    showCloseShiftModal,
    onCloseOpenShift,
    onCloseCloseShift,
    onOpenShift,
    onCloseShift,
    staff,
    closingData,
    lastShiftEndBalance
}: ShiftModalsProps) => {
    const toast = useToast();

    // Open Shift State
    const [startBalance, setStartBalance] = useState("");
    const [shiftOpenerId, setShiftOpenerId] = useState("");

    // Close Shift State
    const [endBalance, setEndBalance] = useState("");

    useEffect(() => {
        if (showOpenShiftModal) {
            setStartBalance(lastShiftEndBalance || "0");
            setShiftOpenerId("");
        }
    }, [showOpenShiftModal, lastShiftEndBalance]);

    useEffect(() => {
        if (showCloseShiftModal) {
            setEndBalance("");
        }
    }, [showCloseShiftModal]);

    const handleOpenShiftSubmit = () => {
        const balance = Number(startBalance);
        if (isNaN(balance)) {
            toast.error("Некоректна сума");
            return;
        }
        onOpenShift(balance, shiftOpenerId);
    };

    const handleCloseShiftSubmit = () => {
        const balance = Number(endBalance);
        if (isNaN(balance)) {
            toast.error("Некоректна сума");
            return;
        }
        if (!endBalance || endBalance === '') {
            toast.error("Фактична готівка є обов'язковим полем");
            return;
        }
        onCloseShift(balance);
    };

    // Validation for close shift button
    const isCloseShiftDisabled = !endBalance || endBalance === '' || isNaN(Number(endBalance));

    // Calculate difference
    const difference = closingData ? Number(endBalance) - closingData.expectedBalance : 0;
    const getDifferenceClass = () => {
        if (!endBalance || endBalance === '') return '';
        if (difference === 0) return styles.positive;
        if (difference < 0) return styles.negative;
        return styles.positive;
    };

    return (
        <>
            {/* Open Shift Modal */}
            {showOpenShiftModal && (
                <Modal
                    isOpen={true}
                    title="🔓 Відкриття зміни"
                    onClose={onCloseOpenShift}
                    size="md"
                >
                    <div className={styles.modalContent}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Початковий залишок</label>
                            <input
                                type="number"
                                value={startBalance}
                                onChange={(e) => setStartBalance(e.target.value)}
                                placeholder="0.00"
                                className={styles.balanceInput}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Хто відкриває?</label>
                            <div className={styles.staffGrid}>
                                {staff.map(member => (
                                    <div
                                        key={member.id}
                                        className={`${styles.staffMember} ${shiftOpenerId === member.id ? styles.active : ''}`}
                                        onClick={() => setShiftOpenerId(member.id)}
                                    >
                                        {member.name}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={styles.actionButtons}>
                            <Button variant="outline" onClick={onCloseOpenShift}>
                                Скасувати
                            </Button>
                            <Button variant="success" onClick={handleOpenShiftSubmit}>
                                Відкрити зміну
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Close Shift Modal */}
            {showCloseShiftModal && closingData && (
                <Modal
                    isOpen={true}
                    title="🔒 Закриття зміни (Z-звіт)"
                    onClose={onCloseCloseShift}
                    size="lg"
                >
                    <div className={styles.modalContent}>
                        {/* Summary Card */}
                        <div className={styles.summaryCard}>
                            <div className={`${styles.summaryRow} ${styles.green}`}>
                                <span className={styles.label}>Початковий залишок:</span>
                                <span className={styles.value}>{formatCurrency(closingData.startBalance)}</span>
                            </div>
                            <div className={`${styles.summaryRow} ${styles.green}`}>
                                <span className={styles.label}>Продажі (Готівка):</span>
                                <span className={styles.value}>{formatCurrency(closingData.totalSalesCash)}</span>
                            </div>
                            <div className={`${styles.summaryRow} ${styles.blue}`}>
                                <span className={styles.label}>Продажі (Картка):</span>
                                <span className={styles.value}>{formatCurrency(closingData.totalSalesCard)}</span>
                            </div>
                            <div className={`${styles.summaryRow} ${styles.green}`}>
                                <span className={styles.label}>Внесення (Income):</span>
                                <span className={styles.value}>{formatCurrency(closingData.totalIncome)}</span>
                            </div>
                            <div className={`${styles.summaryRow} ${styles.red}`}>
                                <span className={styles.label}>Витрати (Expense):</span>
                                <span className={styles.value}>{formatCurrency(closingData.totalExpenses)}</span>
                            </div>
                            <div className={`${styles.summaryRow} ${styles.purple}`}>
                                <span className={styles.label}>Інкасація:</span>
                                <span className={styles.value}>{formatCurrency(closingData.totalIncasation)}</span>
                            </div>
                            <div className={`${styles.summaryRow} ${styles.total} ${styles.yellow}`}>
                                <span className={styles.label}>Очікувана готівка в касі:</span>
                                <span className={styles.value}>{formatCurrency(closingData.expectedBalance)}</span>
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={`${styles.formLabel} ${styles.formLabelRequired}`}>
                                Фактична готівка в касі
                            </label>
                            <input
                                type="number"
                                value={endBalance}
                                onChange={(e) => setEndBalance(e.target.value)}
                                placeholder="Введіть фактичну готівку"
                                className={`${styles.balanceInput} ${!endBalance || endBalance === ''
                                        ? ''
                                        : Number(endBalance) === closingData.expectedBalance
                                            ? styles.success
                                            : Math.abs(Number(endBalance) - closingData.expectedBalance) > 10
                                                ? styles.error
                                                : styles.warning
                                    }`}
                                style={{
                                    borderColor: !endBalance || endBalance === ''
                                        ? 'var(--gray-300)'
                                        : Number(endBalance) === closingData.expectedBalance
                                            ? 'var(--success-main)'
                                            : Math.abs(Number(endBalance) - closingData.expectedBalance) > 10
                                                ? 'var(--error-main)'
                                                : 'var(--warning-main)'
                                }}
                            />
                            {!endBalance || endBalance === '' ? (
                                <div className={styles.differenceDisplay} style={{ color: 'var(--error-text)' }}>
                                    ⚠️ Обов'язкове поле
                                </div>
                            ) : (
                                <div className={`${styles.differenceDisplay} ${getDifferenceClass()}`}>
                                    Різниця: {formatCurrency(difference)}
                                </div>
                            )}
                        </div>

                        <div className={styles.actionButtons}>
                            <Button variant="outline" onClick={onCloseCloseShift} disabled={isCloseShiftDisabled}>
                                Скасувати
                            </Button>
                            <Button
                                variant="danger"
                                onClick={handleCloseShiftSubmit}
                                disabled={isCloseShiftDisabled}
                            >
                                Закрити зміну
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
};
