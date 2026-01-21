import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui';
import { useToast } from '@/components/ui/ToastContext';
import { formatCurrency } from '@/utils/format';

interface ShiftModalsProps {
    showOpenShiftModal: boolean;
    showCloseShiftModal: boolean;
    onCloseOpenShift: () => void;
    onCloseCloseShift: () => void;
    onOpenShift: (balance: number, cashierId: string) => Promise<void>;
    onCloseShift: (endBalance: number) => Promise<void>;
    staff: any[]; // Or proper Staff type
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
        onCloseShift(balance);
    };

    return (
        <>
            {/* Open Shift Modal */}
            {showOpenShiftModal && (
                <Modal
                    isOpen={true}
                    title="🔓 Відкриття зміни"
                    onClose={onCloseOpenShift}
                >
                    <div style={{ padding: '20px' }}>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', color: '#374151' }}>Початковий залишок</label>
                            <input
                                type="number"
                                value={startBalance}
                                onChange={(e) => setStartBalance(e.target.value)}
                                placeholder="0.00"
                                style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1.2rem', fontWeight: 'bold' }}
                            />
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', color: '#374151' }}>Хто відкриває?</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
                                {staff.map(member => (
                                    <div
                                        key={member.id}
                                        onClick={() => setShiftOpenerId(member.id)}
                                        style={{
                                            padding: '10px',
                                            border: shiftOpenerId === member.id ? '2px solid #2563eb' : '1px solid #ccc',
                                            borderRadius: '8px',
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            background: shiftOpenerId === member.id ? '#eff6ff' : 'white',
                                            fontWeight: shiftOpenerId === member.id ? 'bold' : 'normal',
                                            color: shiftOpenerId === member.id ? '#1e3a8a' : 'inherit'
                                        }}
                                    >
                                        {member.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={onCloseOpenShift} style={{ padding: '8px 16px', background: '#ccc', borderRadius: '4px', border: 'none' }}>Скасувати</button>
                            <button
                                onClick={handleOpenShiftSubmit}
                                style={{ padding: '8px 16px', background: '#22c55e', color: 'white', borderRadius: '4px', border: 'none', fontWeight: 'bold' }}
                            >
                                Відкрити зміну
                            </button>
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
                >
                    <div style={{ padding: '20px' }}>
                        <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span>Початковий залишок:</span>
                                <b>{formatCurrency(closingData.startBalance)}</b>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span>Продажі (Готівка):</span>
                                <b style={{ color: '#22c55e' }}>{formatCurrency(closingData.totalSalesCash)}</b>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span>Продажі (Картка):</span>
                                <b style={{ color: '#3b82f6' }}>{formatCurrency(closingData.totalSalesCard)}</b>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span>Внесення (Income):</span>
                                <b style={{ color: '#22c55e' }}>{formatCurrency(closingData.totalIncome)}</b>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span>Витрати (Expense):</span>
                                <b style={{ color: '#ef4444' }}>{formatCurrency(closingData.totalExpenses)}</b>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span>Інкасація:</span>
                                <b style={{ color: '#a855f7' }}>{formatCurrency(closingData.totalIncasation)}</b>
                            </div>
                            <div style={{ borderTop: '1px solid #ddd', margin: '10px 0' }}></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem' }}>
                                <span>Очікувана готівка в касі:</span>
                                <b style={{ color: '#ca8a04' }}>{formatCurrency(closingData.expectedBalance)}</b>
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', color: '#374151' }}>Фактична готівка в касі</label>
                            <input
                                type="number"
                                value={endBalance}
                                onChange={(e) => setEndBalance(e.target.value)}
                                placeholder={"Введіть фактичну готівку"}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    fontSize: '1.2rem',
                                    fontWeight: 'bold',
                                    borderColor: Number(endBalance) === closingData.expectedBalance
                                        ? '#22c55e'
                                        : Math.abs(Number(endBalance) - closingData.expectedBalance) > 10
                                            ? '#ef4444'
                                            : '#eab308'
                                }}
                            />
                            {endBalance && (
                                <div style={{
                                    marginTop: '5px', fontSize: '0.9rem', textAlign: 'right', fontWeight: 'bold',
                                    color: Number(endBalance) - closingData.expectedBalance === 0 ? '#22c55e' : (Number(endBalance) - closingData.expectedBalance < 0 ? '#ef4444' : '#22c55e')
                                }}>
                                    Різниця: {formatCurrency(Number(endBalance) - closingData.expectedBalance)}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={onCloseCloseShift} style={{ padding: '8px 16px', background: '#ccc', borderRadius: '4px', border: 'none' }}>Скасувати</button>
                            <button
                                onClick={handleCloseShiftSubmit}
                                style={{ padding: '8px 16px', background: '#ef4444', color: 'white', borderRadius: '4px', border: 'none', fontWeight: 'bold' }}
                            >
                                Закрити зміну
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
};
