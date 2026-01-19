import { useState } from 'react';
import { Modal } from '@/components/ui';
import { useToast } from '@/components/ui/ToastContext';

interface TransactionModalProps {
    isOpen: boolean;
    type: 'income' | 'expense' | 'incasation';
    onClose: () => void;
    shiftId: string;
    activeStaffIds: string[];
    allStaff: any[]; // Or proper Staff type
    onSuccess: () => void;
}

export const TransactionModal = ({
    isOpen,
    type,
    onClose,
    shiftId,
    activeStaffIds,
    allStaff,
    onSuccess
}: TransactionModalProps) => {
    const toast = useToast();
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");
    const [comment, setComment] = useState("");

    const handleCreateTransaction = async () => {
        if (!amount || Number(amount) <= 0) {
            toast.error("Введіть коректну суму");
            return;
        }

        // Auto-select author (first active staff or 'Admin')
        const authorId = activeStaffIds.length > 0 ? activeStaffIds[0] : null;
        const author = allStaff.find(s => s.id === authorId);

        try {
            const res = await fetch('/api/cash-register/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shiftId: shiftId,
                    type: type,
                    category: category,
                    amount: Number(amount),
                    comment: comment,
                    authorId: author?.id,
                    authorName: author?.name || 'Admin'
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Операцію успішно збережено");
                onSuccess();
                onClose();
                setAmount("");
                setCategory("");
                setComment("");
            } else {
                toast.error("Помилка: " + data.error);
            }
        } catch (e) {
            toast.error("Помилка мережі");
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            title={
                type === 'income' ? '➕ Внесення коштів' :
                    type === 'expense' ? '➖ Витрати' : '🏦 Інкасація'
            }
            onClose={onClose}
        >
            <div style={{ padding: '20px' }}>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', color: '#374151' }}>Сума</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1.2rem', fontWeight: 'bold' }}
                        autoFocus
                    />
                </div>

                {type === 'expense' && (
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', color: '#374151' }}>Категорія витрат</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                        >
                            <option value="Business Expenses">Господарські витрати</option>
                            <option value="Supplier Payment">Оплата постачальникам</option>
                            <option value="Utilities">Комунальні платежі</option>
                            <option value="Other">Інше</option>
                        </select>
                    </div>
                )}

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', color: '#374151' }}>Коментар</label>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder={type === 'expense' ? "На що витрачено..." : "Примітка..."}
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', minHeight: '60px' }}
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', background: '#ccc', borderRadius: '4px', border: 'none' }}>Скасувати</button>
                    <button
                        onClick={handleCreateTransaction}
                        style={{
                            padding: '8px 16px',
                            background: type === 'income' ? '#22c55e' : type === 'expense' ? '#ef4444' : '#a855f7',
                            color: 'white',
                            borderRadius: '4px',
                            border: 'none',
                            fontWeight: 'bold'
                        }}
                    >
                        Зберегти
                    </button>
                </div>
            </div>
        </Modal>
    );
};
