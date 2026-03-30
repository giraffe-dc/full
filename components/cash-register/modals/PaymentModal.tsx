"use client";

import { useState, useEffect } from 'react';
import { Modal, Button, Input } from '@/components/ui';
import { useToast } from '@/components/ui/ToastContext';
import { Check, Receipt } from '@/types/cash-register';
import { formatCurrency } from '@/utils/format';
import styles from './PaymentModal.module.css';

interface PaymentModalProps {
    isOpen: boolean;
    check: Check | null;
    onClose: () => void;
    onPay: (method: 'cash' | 'card' | 'mixed', amounts: { cash: number, card: number }, amountGiven: string) => Promise<void>;
    receipt: Receipt | null;
    showReceiptModal: boolean;
    onCloseReceipt: () => void;
}

// Cash denominations for quick selection
const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 1];

export const PaymentModal = ({
    isOpen,
    check,
    onClose,
    onPay,
    receipt,
    showReceiptModal,
    onCloseReceipt
}: PaymentModalProps) => {
    const toast = useToast();

    // Calculate total first (before hooks)
    const total = check ? check.total : 0;

    // Payment State
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mixed'>('cash');
    const [paymentAmounts, setPaymentAmounts] = useState({ cash: 0, card: 0 });
    const [amountGiven, setAmountGiven] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (isOpen && check) {
            setPaymentMethod('cash');
            setPaymentAmounts({ cash: 0, card: 0 });
            setAmountGiven("");
        }
    }, [isOpen, check]);

    // Auto-calculate: when cash changes, card = total - cash
    useEffect(() => {
        if (paymentMethod === 'mixed' && total > 0) {
            const remaining = total - paymentAmounts.cash;
            if (remaining > 0) {
                setPaymentAmounts(prev => ({ ...prev, card: remaining }));
            } else {
                setPaymentAmounts(prev => ({ ...prev, card: 0 }));
            }
        }
    }, [paymentAmounts.cash, total, paymentMethod]);

    if (!check && !receipt) return null;

    const handleConfirmPay = async () => {
        if (isProcessing) return;

        console.log("💳 Payment Initiated for Check:", check?.id);
        console.log("Method:", paymentMethod, "Amounts:", paymentAmounts, "Given:", amountGiven);

        setIsProcessing(true);
        try {
            await onPay(paymentMethod, paymentAmounts, amountGiven);
            console.log("✅ Payment Success");
        } catch (error) {
            console.error("❌ Payment Failed", error);
            toast.error("Помилка оплати. Спробуйте ще раз.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDenomClick = (denom: number) => {
        const current = Number(amountGiven) || 0;
        setAmountGiven((current + denom).toString());
    };

    const change = (Number(amountGiven) || 0) - total;

    // Check if payment is exactly equal to total (for mixed) or sufficient (for cash)
    const isAmountExact = paymentMethod === 'mixed'
        ? Math.abs((paymentAmounts.cash + paymentAmounts.card) - total) < 0.01
        : paymentMethod === 'card'
            ? true
            : Math.abs((Number(amountGiven) || 0) - total) < 0.01 || (Number(amountGiven) || 0) >= total;

    return (
        <>
            {/* Payment Modal */}
            {isOpen && check && (
                <Modal
                    isOpen={true}
                    title={`💰 Оплата чеку #${check.id.slice(-4)}`}
                    onClose={() => !isProcessing && onClose()}
                    size="lg"
                >
                    <div className={styles.modalContent}>
                        {/* Total Amount Display */}
                        <div className={styles.amountDisplay}>
                            {formatCurrency(total)}
                        </div>

                        {/* Method Selection */}
                        <div className={styles.paymentMethods}>
                            <button
                                className={`${styles.paymentMethodBtn} ${paymentMethod === 'cash' ? styles.active : ''}`}
                                onClick={() => setPaymentMethod('cash')}
                                disabled={isProcessing}
                            >
                                <span className={styles.icon}>💵</span>
                                <span className={styles.label}>Готівка</span>
                            </button>
                            <button
                                className={`${styles.paymentMethodBtn} ${paymentMethod === 'card' ? styles.active : ''}`}
                                onClick={() => setPaymentMethod('card')}
                                disabled={isProcessing}
                            >
                                <span className={styles.icon}>💳</span>
                                <span className={styles.label}>Картка</span>
                            </button>
                            <button
                                className={`${styles.paymentMethodBtn} ${paymentMethod === 'mixed' ? styles.active : ''}`}
                                onClick={() => setPaymentMethod('mixed')}
                                disabled={isProcessing}
                            >
                                <span className={styles.icon}>🔀</span>
                                <span className={styles.label}>Змішана</span>
                            </button>
                        </div>

                        {/* Cash Payment */}
                        {paymentMethod === 'cash' && (
                            <div className={styles.cashSection}>
                                <div className={styles.inputWrapper}>
                                    <Input
                                        label="Отримано від клієнта"
                                        type="number"
                                        value={amountGiven}
                                        onChange={(e) => setAmountGiven(e.target.value)}
                                        placeholder={total.toString()}
                                        size="lg"
                                        autoFocus
                                        disabled={isProcessing}
                                    />
                                </div>

                                {/* Quick Denominations */}
                                <div className={styles.denominationsGrid}>
                                    {DENOMINATIONS.map((denom) => (
                                        <button
                                            key={denom}
                                            className={styles.denomBtn}
                                            onClick={() => handleDenomClick(denom)}
                                            disabled={isProcessing}
                                        >
                                            {denom}₴
                                        </button>
                                    ))}
                                </div>

                                {/* Change Display */}
                                {amountGiven && (
                                    <div className={styles.changeDisplay}>
                                        <div className={styles.changeLabel}>Решта:</div>
                                        <div className={`${styles.changeAmount} ${change < 0 ? styles.negative : ''}`}>
                                            {formatCurrency(change > 0 ? change : 0)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Card Payment */}
                        {paymentMethod === 'card' && (
                            <div className={styles.cardSection}>
                                <div className={styles.cardIcon}>💳</div>
                                <p className={styles.cardText}>
                                    Проведіть оплату через термінал на суму <b>{formatCurrency(total)}</b>
                                </p>
                            </div>
                        )}

                        {/* Mixed Payment */}
                        {paymentMethod === 'mixed' && (
                            <div className={styles.mixedSection}>
                                <div className={styles.mixedInput}>
                                    <div className={styles.mixedLabel}>Готівка</div>
                                    <Input
                                        type="number"
                                        value={paymentAmounts.cash || ''}
                                        onChange={(e) => {
                                            const value = Math.min(Number(e.target.value), total);
                                            setPaymentAmounts({ cash: value, card: 0 });
                                        }}
                                        placeholder="0"
                                        size="md"
                                        disabled={isProcessing}
                                        max={total}
                                    />
                                </div>
                                <div className={styles.mixedInput}>
                                    <div className={styles.mixedLabel}>Картка (автоматично)</div>
                                    <Input
                                        type="number"
                                        value={paymentAmounts.card || ''}
                                        readOnly
                                        placeholder="0"
                                        size="md"
                                        disabled
                                    />
                                </div>
                                <div className={styles.changeDisplay} style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                                    <div className={styles.changeLabel}>Разом:</div>
                                    <div className={styles.changeAmount}>
                                        {formatCurrency(paymentAmounts.cash + paymentAmounts.card)} / {formatCurrency(total)}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className={styles.actionButtons}>
                            <Button
                                variant="outline"
                                onClick={() => !isProcessing && onClose()}
                                disabled={isProcessing}
                            >
                                Скасувати
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleConfirmPay}
                                disabled={isProcessing || !isAmountExact}
                                fullWidth
                            >
                                {isProcessing ? 'Обробка...' : `Сплатити ${formatCurrency(total)}`}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Receipt Success Modal */}
            {showReceiptModal && receipt && (
                <Modal
                    isOpen={true}
                    title="✅ Оплата успішна!"
                    onClose={onCloseReceipt}
                    size="md"
                >
                    <div className={styles.receiptContent}>
                        <div className={styles.receiptHeader}>
                            <div style={{ fontSize: '4rem', marginBottom: '10px' }}>🧾</div>
                            <h3 className={styles.receiptTitle}>Чек #{receipt.receiptNumber} закрит</h3>
                        </div>

                        <div className={styles.receiptBody}>
                            <div className={styles.receiptTotal}>
                                <span className={styles.label}>Сума:</span>
                                <span className={styles.value}>{formatCurrency(receipt.total)}</span>
                            </div>
                        </div>

                        <div className={styles.receiptFooter}>
                            <p className={styles.receiptThank}>Дякуємо за покупку!</p>
                            <div className={styles.actionButtons}>
                                <Button variant="outline" onClick={onCloseReceipt}>
                                    Новий чек
                                </Button>
                                <Button variant="primary" onClick={() => {/* TODO: Print */ }}>
                                    🖨️ Друк
                                </Button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
};
