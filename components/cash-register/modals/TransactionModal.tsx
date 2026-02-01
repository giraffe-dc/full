import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui';
import { useToast } from '@/components/ui/ToastContext';

interface ExpenseCategory {
    _id: string;
    id: string;
    name: string;
    status: string;
}

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
    const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);

    // Fetch expense categories when modal opens and type is expense
    useEffect(() => {
        if (isOpen && type === 'expense') {
            fetchExpenseCategories();
        }
    }, [isOpen, type]);

    const fetchExpenseCategories = async () => {
        try {
            const res = await fetch('/api/accounting/categories/expense');
            const data = await res.json();
            if (data.data) {
                const activeCategories = data.data.filter((cat: ExpenseCategory) => cat.status === 'active');
                setExpenseCategories(activeCategories);
                // Set default category
                if (activeCategories.length > 0 && !category) {
                    setCategory(activeCategories[0].name);
                }
            }
        } catch (e) {
            console.error('Failed to fetch expense categories:', e);
        }
    };

    const handleCreateTransaction = async () => {
        if (!amount || Number(amount) <= 0) {
            toast.error("Введіть коректну суму");
            return;
        }

        if (type === 'expense' && !category) {
            toast.error("Оберіть категорію витрат");
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
                resetForm();
                onSuccess();
                onClose();
            } else {
                toast.error("Помилка: " + data.error);
            }
        } catch (e) {
            toast.error("Помилка мережі");
        }
    };

    const resetForm = () => {
        setAmount("");
        setCategory("");
        setComment("");
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            title={
                type === 'income' ? '➕ Внесення коштів' :
                    type === 'expense' ? '➖ Витрати' : '🏦 Інкасація'
            }
            onClose={handleClose}
        >
            <div style={{ padding: '24px' }}>
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#374151', fontWeight: '600', fontSize: '13px' }}>Сума</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        style={{ 
                            width: '100%', 
                            padding: '14px 16px', 
                            border: '2px solid #e5e7eb', 
                            borderRadius: '10px', 
                            fontSize: '1.3rem', 
                            fontWeight: 'bold',
                            transition: 'all 0.2s',
                            outline: 'none'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                        autoFocus
                    />
                </div>

                {type === 'expense' && (
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#374151', fontWeight: '600', fontSize: '13px' }}>Категорія витрат</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            style={{ 
                                width: '100%', 
                                padding: '11px 14px', 
                                border: '1.5px solid #e5e7eb', 
                                borderRadius: '10px', 
                                fontSize: '14px',
                                background: 'white',
                                transition: 'all 0.2s',
                                cursor: 'pointer'
                            }}
                        >
                            {expenseCategories.length === 0 ? (
                                <option value="">Завантаження...</option>
                            ) : (
                                expenseCategories.map(cat => (
                                    <option key={cat._id} value={cat.name}>{cat.name}</option>
                                ))
                            )}
                        </select>
                    </div>
                )}

                <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#374151', fontWeight: '600', fontSize: '13px' }}>Коментар</label>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder={type === 'expense' ? "На що витрачено..." : "Примітка..."}
                        style={{ 
                            width: '100%', 
                            padding: '11px 14px', 
                            border: '1.5px solid #e5e7eb', 
                            borderRadius: '10px', 
                            minHeight: '80px',
                            fontSize: '14px',
                            fontFamily: 'inherit',
                            resize: 'vertical',
                            transition: 'all 0.2s',
                            outline: 'none'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '2px solid #f3f4f6' }}>
                    <button 
                        onClick={handleClose} 
                        style={{ 
                            padding: '10px 20px', 
                            background: 'white',
                            border: '1.5px solid #e5e7eb',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontWeight: '500',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                        Скасувати
                    </button>
                    <button
                        onClick={handleCreateTransaction}
                        style={{
                            padding: '10px 24px',
                            background: type === 'income' ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : 
                                       type === 'expense' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 
                                       'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
                            color: 'white',
                            borderRadius: '10px',
                            border: 'none',
                            fontWeight: '600',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        Зберегти
                    </button>
                </div>
            </div>
        </Modal>
    );
};
