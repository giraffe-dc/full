"use client";

import { useState, useEffect } from 'react';
import { Modal, Button, Input } from '@/components/ui';
import { useToast } from '@/components/ui/ToastContext';
import { Check, Receipt, Certificate } from '@/types/cash-register';
import { formatCurrency } from '@/utils/format';
import styles from './PaymentModal.module.css';

interface PaymentModalProps {
    isOpen: boolean;
    check: Check | null;
    onClose: () => void;
    onPay: (method: 'cash' | 'card' | 'mixed' | 'certificate', amounts: { cash: number, card: number, certificate?: number, certificateId?: string }, amountGiven: string) => Promise<void>;
    onDeposit?: (amount: number, method: 'cash' | 'card') => Promise<void>;
    receipt: Receipt | null;
    showReceiptModal: boolean;
    onCloseReceipt: () => void;
    mode?: 'full' | 'deposit'; // full = повна оплата, deposit = прийняти передплату
}

// Cash denominations for quick selection
const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 1];

export const PaymentModal = ({
    isOpen,
    check,
    onClose,
    onPay,
    onDeposit,
    receipt,
    showReceiptModal,
    onCloseReceipt,
    mode = 'full'
}: PaymentModalProps) => {
    const toast = useToast();

    // При deposit-режимі: сума до оплати = total - paidAmount
    const paidAmount = check?.paidAmount || 0;
    const fullTotal = check ? check.total : 0;
    const total = mode === 'full'
        ? Math.max(0, fullTotal - paidAmount)  // залишок після депозиту
        : fullTotal; // при депозиті показуємо повний total для контексту

    // Payment State
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mixed' | 'certificate'>('cash');
    const [paymentAmounts, setPaymentAmounts] = useState({ cash: 0, card: 0, certificate: 0, certificateId: '' });
    const [amountGiven, setAmountGiven] = useState("");
    const [depositAmount, setDepositAmount] = useState(""); // для режиму deposit
    const [isProcessing, setIsProcessing] = useState(false);
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [certSettings, setCertSettings] = useState<any>(null);
    const [depositMethod, setDepositMethod] = useState<'cash' | 'card'>('cash');
    const [showDepositReceipt, setShowDepositReceipt] = useState(false);
    const [depositReceiptData, setDepositReceiptData] = useState<any>(null);

    useEffect(() => {
        if (isOpen && check) {
            setPaymentMethod('cash');
            setPaymentAmounts({ cash: 0, card: 0, certificate: 0, certificateId: '' });
            setAmountGiven("");
            setDepositAmount("");
            setDepositMethod('cash');
            if (check.customerId) {
                fetch(`/api/certificates/client/${check.customerId}?status=active`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) setCertificates(data.data);
                    });
            } else {
                setCertificates([]);
            }

            fetch('/api/certificates/settings')
                .then(res => res.json())
                .then(data => {
                    if (data.success) setCertSettings(data.data);
                });
        }
    }, [isOpen, check]);

    // Auto-calculate: when cash changes, card = total - cash - certificate
    useEffect(() => {
        if (paymentMethod === 'mixed' && total > 0) {
            const remaining = total - paymentAmounts.cash - paymentAmounts.certificate;
            if (remaining > 0) {
                setPaymentAmounts(prev => ({ ...prev, card: remaining }));
            } else {
                setPaymentAmounts(prev => ({ ...prev, card: 0 }));
            }
        }
    }, [paymentAmounts.cash, paymentAmounts.certificate, total, paymentMethod]);

    if (!check && !receipt) return null;

    // === ОБРОБНИК ПЕРЕДПЛАТИ ===
    const handleConfirmDeposit = async () => {
        if (isProcessing) return;
        const amount = parseFloat(depositAmount);
        if (!amount || amount <= 0) {
            toast.error("Введіть суму передплати");
            return;
        }
        const remaining = fullTotal - paidAmount;
        if (amount > remaining + 0.01) {
            toast.error(`Сума передплати (${amount.toFixed(2)} ₴) перевищує залишок до сплати (${remaining.toFixed(2)} ₴)`);
            return;
        }
        setIsProcessing(true);
        try {
            await onDeposit?.(amount, depositMethod);
            toast.success(`Передплату ${amount.toFixed(2)} ₴ прийнято!`);
            setDepositReceiptData({
                amount,
                method: depositMethod,
                checkTotal: fullTotal,
                remaining: fullTotal - paidAmount - amount,
                checkId: check?.id?.slice(-4),
                tableName: check?.tableName,
                date: new Date()
            });
            setShowDepositReceipt(true);
        } catch (error) {
            toast.error("Помилка при внесенні передплати");
        } finally {
            setIsProcessing(false);
        }
    };

    // === ОБРОБНИК ПОВНОЇ ОПЛАТИ ===
    const handleConfirmPay = async () => {
        if (isProcessing) return;

        setIsProcessing(true);
        try {
            await onPay(paymentMethod, paymentAmounts, amountGiven);
        } catch (error) {
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

    // При повній оплаті: відображаємо суму залишку (total - paidAmount)
    const displayTotal = mode === 'full' ? total : fullTotal;

    // Check if payment is exactly equal to total (for mixed) or sufficient (for cash)
    const selectedCert = certificates.find(c => c.id === paymentAmounts.certificateId);
    let certCovers = 0;
    if (selectedCert) {
        if (selectedCert.type === 'amount') {
            // Filter items by category if restrictions apply
            const allowedCats = selectedCert.applicableCategories?.length 
                ? selectedCert.applicableCategories 
                : certSettings?.allowedCategories;

            let applicableTotal = total;
            if (allowedCats && allowedCats.length > 0) {
                applicableTotal = check?.items
                    .filter(item => allowedCats.includes(item.category))
                    .reduce((sum, item) => sum + item.subtotal, 0) || 0;
            }
            
            certCovers = Math.min(selectedCert.balance || 0, applicableTotal);
            
            // Apply max coverage per visit if set
            if (selectedCert.maxCoveragePerVisit && selectedCert.maxCoveragePerVisit > 0) {
                certCovers = Math.min(certCovers, selectedCert.maxCoveragePerVisit);
            }
        } else if (selectedCert.type === 'service') {
            const item = check?.items.find(i => i.productId === selectedCert.serviceId);
            certCovers = item ? item.price : 0; // covers 1 quantity of the service
        } else if (selectedCert.type === 'visits') {
            if (selectedCert.serviceId) {
                const item = check?.items.find(i => i.productId === selectedCert.serviceId);
                certCovers = item ? item.price : 0;
            } else {
                certCovers = total; // generic visit covers the whole check
            }
        }
    }

    // In mixed mode, ensure the certificate amount doesn't exceed what it covers
    const effectiveCertAmount = paymentMethod === 'mixed' 
        ? Math.min(paymentAmounts.certificate || 0, certCovers) 
        : (paymentMethod === 'certificate' ? total : 0);

    const isAmountExact = paymentMethod === 'mixed'
        ? Math.abs((paymentAmounts.cash + paymentAmounts.card + effectiveCertAmount) - total) < 0.01 && paymentAmounts.certificate <= certCovers + 0.01
        : paymentMethod === 'card'
            ? true
            : paymentMethod === 'certificate'
                ? !!paymentAmounts.certificateId && certCovers >= total - 0.01 // Must cover the entire check
                : Math.abs((Number(amountGiven) || 0) - total) < 0.01 || (Number(amountGiven) || 0) >= total;

    return (
        <>
            {/* Payment Modal */}
            {isOpen && check && (
                <Modal
                    isOpen={true}
                    title={mode === 'deposit'
                        ? `💰 Передплата по чеку #${check.id.slice(-4)}`
                        : `💰 Оплата чеку #${check.id.slice(-4)}`}
                    onClose={() => !isProcessing && onClose()}
                    size="lg"
                >
                    <div className={styles.modalContent}>
                        {/* Інфо про передплату якщо є */}
                        {paidAmount > 0 && mode === 'full' && (
                            <div style={{
                                background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                                border: '1px solid #86efac',
                                borderRadius: '10px',
                                padding: '10px 16px',
                                marginBottom: '12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '0.9rem'
                            }}>
                                <span>💰 Передплата:</span>
                                <span style={{ fontWeight: 700, color: '#16a34a' }}>-{formatCurrency(paidAmount)}</span>
                            </div>
                        )}

                        {/* Total Amount Display */}
                        <div className={styles.amountDisplay}>
                            {mode === 'deposit' ? (
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '4px' }}>Загальна сума чеку</div>
                                    <div>{formatCurrency(fullTotal)}</div>
                                </div>
                            ) : (
                                formatCurrency(total)
                            )}
                        </div>

                        {/* === РЕЖИМ ПЕРЕДПЛАТИ (DEPOSIT) === */}
                        {mode === 'deposit' && (
                            <div className={styles.cashSection}>
                                <div style={{ marginBottom: '16px', textAlign: 'center', color: '#374151', fontSize: '0.95rem' }}>
                                    Введіть суму та спосіб оплати передплати
                                </div>

                                {/* Метод передплати */}
                                <div className={styles.paymentMethods} style={{ marginBottom: '16px' }}>
                                    <button
                                        className={`${styles.paymentMethodBtn} ${depositMethod === 'cash' ? styles.active : ''}`}
                                        onClick={() => setDepositMethod('cash')}
                                        disabled={isProcessing}
                                    >
                                        <span className={styles.icon}>💵</span>
                                        <span className={styles.label}>Готівка</span>
                                    </button>
                                    <button
                                        className={`${styles.paymentMethodBtn} ${depositMethod === 'card' ? styles.active : ''}`}
                                        onClick={() => setDepositMethod('card')}
                                        disabled={isProcessing}
                                    >
                                        <span className={styles.icon}>💳</span>
                                        <span className={styles.label}>Картка</span>
                                    </button>
                                </div>

                                {/* Сума передплати */}
                                <div className={styles.inputWrapper}>
                                    <Input
                                        label="Сума передплати (₴)"
                                        type="number"
                                        value={depositAmount}
                                        onChange={(e) => setDepositAmount(e.target.value)}
                                        placeholder={`Макс: ${(fullTotal - paidAmount).toFixed(2)}`}
                                        size="lg"
                                        autoFocus
                                        disabled={isProcessing}
                                    />
                                </div>

                                {/* Швидкий вибір номіналів */}
                                <div className={styles.denominationsGrid}>
                                    {DENOMINATIONS.map((denom) => (
                                        <button
                                            key={denom}
                                            className={styles.denomBtn}
                                            onClick={() => setDepositAmount(denom.toString())}
                                            disabled={isProcessing}
                                        >
                                            {denom}₴
                                        </button>
                                    ))}
                                </div>

                                {/* Кнопки дій */}
                                <div className={styles.actionButtons} style={{ marginTop: '20px' }}>
                                    <Button variant="outline" onClick={() => !isProcessing && onClose()} disabled={isProcessing}>
                                        Скасувати
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={handleConfirmDeposit}
                                        disabled={isProcessing || !depositAmount || parseFloat(depositAmount) <= 0}
                                        fullWidth
                                        style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
                                    >
                                        {isProcessing ? 'Обробка...' : `✅ Прийняти ${depositAmount ? formatCurrency(parseFloat(depositAmount)) : ''}`}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* === РЕЖИМ ПОВНОЇ ОПЛАТИ (FULL) === */}
                        {mode === 'full' && (
                        <>
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
                            {certificates.length > 0 && (
                                <button
                                    className={`${styles.paymentMethodBtn} ${paymentMethod === 'certificate' ? styles.active : ''}`}
                                    onClick={() => setPaymentMethod('certificate')}
                                    disabled={isProcessing}
                                    style={{ borderColor: paymentMethod === 'certificate' ? '#10b981' : undefined }}
                                >
                                    <span className={styles.icon}>🎁</span>
                                    <span className={styles.label}>Сертифікат</span>
                                </button>
                            )}
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

                        {/* Certificate Payment */}
                        {paymentMethod === 'certificate' && (
                            <div className={styles.cashSection} style={{ textAlign: 'center', padding: '20px' }}>
                                <h4>Виберіть сертифікат для повної оплати</h4>
                                <select 
                                    className={styles.inputWrapper} 
                                    style={{ width: '100%', padding: '10px', marginTop: '10px' }}
                                    value={paymentAmounts.certificateId}
                                    onChange={e => setPaymentAmounts({ ...paymentAmounts, certificateId: e.target.value, certificate: total })}
                                >
                                    <option value="">-- Виберіть сертифікат --</option>
                                    {certificates.map(c => {
                                        let disabled = false;
                                        if (c.type === 'service') {
                                            disabled = !check?.items.some(i => i.productId === c.serviceId);
                                        }
                                        return (
                                            <option key={c.id} value={c.id} disabled={disabled}>
                                                {c.code} - {c.type === 'amount' ? `Залишок: ${c.balance} ₴` : c.type === 'visits' ? `Відвідування: ${c.visitsTotal! - c.visitsUsed!} шт.` : `Послуга: ${c.serviceName}`}{disabled ? ' (Послуги немає в чеку)' : ''} {(c as any).typeSettings?.canBeMixed === false ? ' [Тільки повна оплата]' : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                                {selectedCert && certCovers < total - 0.01 && (
                                    <div style={{ 
                                        marginTop: '15px', 
                                        padding: '14px', 
                                        background: '#fff5f5', 
                                        color: '#c53030', 
                                        borderRadius: '12px', 
                                        fontSize: '0.85rem', 
                                        textAlign: 'left',
                                        border: '1px solid #feb2b2',
                                        lineHeight: '1.4'
                                    }}>
                                        <div style={{ fontWeight: '700', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            ⚠️ Обмеження покриття
                                        </div>
                                        Цей сертифікат покриває лише <b>{certCovers.toFixed(2)} ₴</b> (залишок або вибрана послуга).
                                        Залишок <b>{(total - certCovers).toFixed(2)} ₴</b> потрібно сплатити іншим способом.
                                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(197, 48, 48, 0.1)' }}>
                                            {(selectedCert as any).typeSettings?.canBeMixed !== false ? (
                                                <span>💡 Використовуйте вкладку <b>"Змішана оплата"</b> для доплати.</span>
                                            ) : (
                                                <span style={{ fontWeight: '600' }}>🚫 Цей вид сертифіката не підтримує змішану оплату.</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Mixed Payment */}
                        {paymentMethod === 'mixed' && (
                            <div className={styles.mixedSection}>
                                {certificates.length > 0 && (
                                    <div className={styles.mixedInput}>
                                        <div className={styles.mixedLabel} style={{ color: 'var(--success-main)' }}>
                                            <span>🎁 Сертифікат</span>
                                            <span className={styles.status}>Доступно: {certificates.length}</span>
                                        </div>
                                        <div className={styles.mixedAmount}>
                                            <select 
                                                className={styles.certSelect}
                                                value={paymentAmounts.certificateId}
                                                onChange={e => {
                                                    const cert = certificates.find(c => c.id === e.target.value);
                                                    let applied = 0;
                                                    if (cert) {
                                                        if (cert.type === 'amount') applied = Math.min(cert.balance || 0, total);
                                                        else if (cert.type === 'service') {
                                                            const item = check?.items.find(i => i.productId === cert.serviceId);
                                                            if (item) applied = item.price;
                                                            else { toast.error(`В чеку немає послуги "${cert.serviceName}"!`); return; }
                                                        } else if (cert.type === 'visits') {
                                                            if (cert.serviceId) {
                                                                const item = check?.items.find(i => i.productId === cert.serviceId);
                                                                if (item) applied = item.price;
                                                                else { toast.error("Послуги немає в чеку!"); return; }
                                                            } else applied = total;
                                                        }
                                                    }
                                                    setPaymentAmounts({ ...paymentAmounts, certificateId: e.target.value, certificate: applied, cash: 0, card: 0 });
                                                }}
                                            >
                                                <option value="">-- Не вибрано --</option>
                                                {certificates.map(c => {
                                                    let disabled = false;
                                                    if ((c as any).typeSettings?.canBeMixed === false) disabled = true;
                                                    if (c.type === 'service' || (c.type === 'visits' && c.serviceId)) {
                                                        if (!check?.items.some(i => i.productId === c.serviceId)) disabled = true;
                                                    }
                                                    return (
                                                        <option key={c.id} value={c.id} disabled={disabled}>
                                                            {c.code} ({c.type === 'amount' ? `${c.balance} ₴` : c.type === 'service' ? `Послуга: ${c.serviceName}` : 'Відвідування'}){disabled ? ((c as any).typeSettings?.canBeMixed === false ? ' [Тільки повна]' : ' [Немає в чеку]') : ''}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                            <div style={{ width: '120px' }}>
                                                <Input
                                                    type="number"
                                                    value={paymentAmounts.certificate || ''}
                                                    onChange={(e) => {
                                                        const cert = certificates.find(c => c.id === paymentAmounts.certificateId);
                                                        let limit = total;
                                                        if (cert?.type === 'amount') limit = cert.balance || 0;
                                                        else if (cert?.type === 'service') {
                                                            const item = check?.items.find(i => i.productId === cert.serviceId);
                                                            limit = item ? item.price : 0;
                                                        }
                                                        const value = Math.min(Number(e.target.value), limit);
                                                        setPaymentAmounts({ ...paymentAmounts, certificate: value, cash: 0, card: 0 });
                                                    }}
                                                    placeholder="0"
                                                    disabled={!paymentAmounts.certificateId}
                                                    readOnly={paymentAmounts.certificateId ? certificates.find(c => c.id === paymentAmounts.certificateId)?.type !== 'amount' : false}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className={styles.mixedInput}>
                                    <div className={styles.mixedLabel}>💵 Готівка</div>
                                    <Input
                                        type="number"
                                        value={paymentAmounts.cash || ''}
                                        onChange={(e) => {
                                            const cash = Number(e.target.value);
                                            const remaining = Math.max(0, total - paymentAmounts.certificate - cash);
                                            setPaymentAmounts({ ...paymentAmounts, cash, card: remaining });
                                        }}
                                        placeholder="Введіть суму..."
                                    />
                                </div>

                                <div className={styles.mixedInput}>
                                    <div className={styles.mixedLabel} style={{ color: 'var(--gray-400)' }}>
                                        <span>💳 Картка (автоматично)</span>
                                    </div>
                                    <Input
                                        type="number"
                                        value={Math.max(0, total - paymentAmounts.certificate - paymentAmounts.cash).toFixed(2)}
                                        readOnly
                                        style={{ background: 'var(--gray-50)', color: 'var(--gray-500)' }}
                                    />
                                </div>

                                <div className={styles.changeDisplay} style={{ marginTop: '10px' }}>
                                    <div className={styles.changeLabel}>Разом обрано для оплати:</div>
                                    <div className={`${styles.changeAmount} ${(paymentAmounts.cash + paymentAmounts.card + paymentAmounts.certificate) < total - 0.01 ? styles.negative : ''}`}>
                                        {formatCurrency(paymentAmounts.cash + (paymentAmounts.card || 0) + paymentAmounts.certificate)} / {formatCurrency(total)}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        {mode === 'full' && (
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
                        )}
                        </> /* end mode === 'full' */
                        )}
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

            {/* Deposit Receipt Modal */}
            {showDepositReceipt && depositReceiptData && (
                <Modal
                    isOpen={true}
                    title="Передплата прийнята"
                    onClose={() => { setShowDepositReceipt(false); onClose(); }}
                    size="sm"
                >
                    <div style={{ padding: '16px' }}>
                        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                            <div style={{ fontSize: '2rem' }}>✅</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 600, marginTop: '8px' }}>
                                {formatCurrency(depositReceiptData.amount)}
                            </div>
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#374151' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span>Спосіб:</span>
                                <span>{depositReceiptData.method === 'cash' ? 'Готівка' : 'Картка'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span>Чек:</span>
                                <span>#{depositReceiptData.checkId} ({depositReceiptData.tableName})</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span>Повна сума:</span>
                                <span>{formatCurrency(depositReceiptData.checkTotal)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontWeight: 600 }}>
                                <span>Залишок до сплати:</span>
                                <span>{formatCurrency(depositReceiptData.remaining)}</span>
                            </div>
                        </div>
                        <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                            <Button variant="primary" fullWidth onClick={() => { setShowDepositReceipt(false); onClose(); }}>
                                Закрити
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
};
