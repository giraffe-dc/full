"use client";

import { useState, useEffect } from 'react';
import { Modal, Button, Input, Textarea, Select } from '@/components/ui';
import { useToast } from '@/components/ui/ToastContext';
import styles from './TransactionModal.module.css';

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
    allStaff: any[];
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
    const [isLoadingCategories, setIsLoadingCategories] = useState(false);

    // Fetch expense categories when modal opens and type is expense
    useEffect(() => {
        if (isOpen && type === 'expense') {
            fetchExpenseCategories();
        }
    }, [isOpen, type]);

    const fetchExpenseCategories = async () => {
        setIsLoadingCategories(true);
        try {
            const res = await fetch('/api/accounting/categories/expense');
            const data = await res.json();
            if (data.data) {
                const activeCategories = data.data.filter((cat: ExpenseCategory) => cat.status === 'active');
                setExpenseCategories(activeCategories);
                if (activeCategories.length > 0 && !category) {
                    setCategory(activeCategories[0].name);
                }
            }
        } catch (e) {
            console.error('Failed to fetch expense categories:', e);
            toast.error("Не вдалося завантажити категорії");
        } finally {
            setIsLoadingCategories(false);
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

    const categoryOptions = expenseCategories.map(cat => ({
        value: cat.name,
        label: cat.name
    }));

    return (
        <Modal
            isOpen={isOpen}
            title={
                type === 'income' ? '➕ Внесення коштів' :
                    type === 'expense' ? '➖ Витрати' : '🏦 Інкасація'
            }
            onClose={handleClose}
            size="md"
        >
            <div className={`${styles.modalContent} ${type === 'income' ? styles.typeIncome :
                    type === 'expense' ? styles.typeExpense : styles.typeIncasation
                }`}>
                {/* Amount */}
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Сума</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className={styles.amountInput}
                        autoFocus
                    />
                </div>

                {/* Category (Expense only) */}
                {type === 'expense' && (
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Категорія витрат</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className={styles.categorySelect}
                            disabled={isLoadingCategories}
                        >
                            {isLoadingCategories ? (
                                <option value="">Завантаження...</option>
                            ) : (
                                expenseCategories.map(cat => (
                                    <option key={cat._id} value={cat.name}>{cat.name}</option>
                                ))
                            )}
                        </select>
                    </div>
                )}

                {/* Comment */}
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                        Коментар
                    </label>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder={type === 'expense' ? "На що витрачено..." : "Примітка..."}
                        className={styles.commentTextarea}
                    />
                </div>

                {/* Action Buttons */}
                <div className={styles.actionButtons}>
                    <Button variant="outline" onClick={handleClose}>
                        Скасувати
                    </Button>
                    <Button
                        variant={
                            type === 'income' ? 'success' :
                                type === 'expense' ? 'danger' : 'purple'
                        }
                        onClick={handleCreateTransaction}
                    >
                        Зберегти
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
