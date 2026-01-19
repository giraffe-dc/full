import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui';
import { useToast } from '@/components/ui/ToastContext';
import { Check, Receipt } from '@/types/cash-register';
import { formatCurrency } from '@/utils/format';

interface PaymentModalProps {
    isOpen: boolean;
    check: Check | null;
    onClose: () => void;
    onPay: (method: 'cash' | 'card' | 'mixed', amounts: { cash: number, card: number }, amountGiven: string) => Promise<void>;
    receipt: Receipt | null;
    showReceiptModal: boolean;
    onCloseReceipt: () => void;
}

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
        } finally {
            setIsProcessing(false);
        }
    };

    const total = check ? check.total : 0;
    const change = (Number(amountGiven) || 0) - total;

    return (
        <>
            {/* Payment Modal */}
            {isOpen && check && (
                <Modal
                    isOpen={true}
                    title={`💰 Оплата чеку #${check.id.slice(-4)}`}
                    onClose={() => !isProcessing && onClose()}
                >
                    <div style={{ padding: '20px' }}>
                        <div style={{ fontSize: '2rem', textAlign: 'center', margin: '20px 0', fontWeight: 'bold', color: '#374151' }}>
                            {formatCurrency(total)}
                        </div>

                        {/* Method Selection */}
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                            <button
                                onClick={() => setPaymentMethod('cash')}
                                disabled={isProcessing}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: paymentMethod === 'cash' ? '#22c55e' : '#f3f4f6',
                                    color: paymentMethod === 'cash' ? 'white' : 'black',
                                    fontWeight: 'bold',
                                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                                    opacity: isProcessing && paymentMethod !== 'cash' ? 0.5 : 1
                                }}
                            >
                                💵 Готівка
                            </button>
                            <button
                                onClick={() => setPaymentMethod('card')}
                                disabled={isProcessing}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: paymentMethod === 'card' ? '#3b82f6' : '#f3f4f6',
                                    color: paymentMethod === 'card' ? 'white' : 'black',
                                    fontWeight: 'bold',
                                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                                    opacity: isProcessing && paymentMethod !== 'card' ? 0.5 : 1
                                }}
                            >
                                💳 Картка
                            </button>
                            <button
                                onClick={() => setPaymentMethod('mixed')}
                                disabled={isProcessing}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: paymentMethod === 'mixed' ? '#a855f7' : '#f3f4f6',
                                    color: paymentMethod === 'mixed' ? 'white' : 'black',
                                    fontWeight: 'bold',
                                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                                    opacity: isProcessing && paymentMethod !== 'mixed' ? 0.5 : 1
                                }}
                            >
                                🔀 Змішана
                            </button>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            {paymentMethod === 'cash' && (
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', color: '#374151' }}>Отримано від клієнта</label>
                                    <input
                                        type="number"
                                        value={amountGiven}
                                        onChange={(e) => setAmountGiven(e.target.value)}
                                        placeholder={total.toString()}
                                        style={{ width: '100%', padding: '15px', fontSize: '1.5rem', borderRadius: '8px', border: '1px solid #ccc' }}
                                        autoFocus
                                        disabled={isProcessing}
                                    />
                                    <div style={{ marginTop: '10px', fontSize: '1.2rem', textAlign: 'right', fontWeight: 'bold', color: change >= 0 ? '#22c55e' : '#ef4444' }}>
                                        Решта: {formatCurrency(change > 0 ? change : 0)}
                                    </div>
                                </div>
                            )}
                            {paymentMethod === 'card' && (
                                <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                                    Проведіть оплату через термінал на суму <b>{formatCurrency(total)}</b>
                                </div>
                            )}
                            {paymentMethod === 'mixed' && (
                                <div>
                                    <div style={{ marginBottom: '10px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px' }}>Готівка</label>
                                        <input
                                            type="number"
                                            value={paymentAmounts.cash || ''}
                                            onChange={(e) => setPaymentAmounts({ ...paymentAmounts, cash: Number(e.target.value) })}
                                            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                                            disabled={isProcessing}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '5px' }}>Картка</label>
                                        <input
                                            type="number"
                                            value={paymentAmounts.card || ''}
                                            onChange={(e) => setPaymentAmounts({ ...paymentAmounts, card: Number(e.target.value) })}
                                            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                                            disabled={isProcessing}
                                        />
                                    </div>
                                    <div style={{ marginTop: '10px', textAlign: 'right', fontWeight: 'bold' }}>
                                        Разом: {formatCurrency((paymentAmounts.cash || 0) + (paymentAmounts.card || 0))} / {formatCurrency(total)}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleConfirmPay}
                            style={{
                                width: '100%',
                                padding: '15px',
                                background: isProcessing ? '#9ca3af' : '#111827',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '1.2rem',
                                fontWeight: 'bold',
                                cursor: isProcessing ? 'not-allowed' : 'pointer',
                                opacity: (paymentMethod === 'mixed' && ((paymentAmounts.cash + paymentAmounts.card) < total)) ? 0.5 : 1
                            }}
                            disabled={isProcessing || (paymentMethod === 'mixed' && ((paymentAmounts.cash + paymentAmounts.card) < total))}
                        >
                            {isProcessing ? 'Обробка...' : `Сплатити ${formatCurrency(total)}`}
                        </button>
                    </div>
                </Modal>
            )}

            {/* Receipt Success Modal */}
            {showReceiptModal && receipt && (
                <Modal
                    isOpen={true}
                    title="✅ Оплата успішна!"
                    onClose={onCloseReceipt}
                >
                    <div style={{ padding: '30px', textAlign: 'center' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '10px' }}>🧾</div>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Чек #{receipt.receiptNumber} закрит</h3>
                        <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '30px' }}>
                            Сума: <b>{formatCurrency(receipt.total)}</b>
                        </p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button
                                onClick={onCloseReceipt}
                                style={{ padding: '10px 30px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', cursor: 'pointer' }}
                            >
                                Новий чек
                            </button>
                            <button
                                // onClick={() => printReceipt(receipt)} // TODO: Implement print
                                style={{ padding: '10px 30px', background: '#e5e7eb', color: 'black', border: 'none', borderRadius: '8px', fontSize: '1.1rem', cursor: 'pointer' }}
                            >
                                🖨️ Друк
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
};
