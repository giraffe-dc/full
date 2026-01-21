
import React from 'react';

interface TransactionModalProps {
    showForm: boolean;
    onCloseForm: () => void;
    form: any;
    onFormChange: (form: any) => void;
    onSubmit: (e: React.FormEvent) => void;
    categories: string[];
    categoryLabels: Record<string, string>;
    accounts: any[];
}

export function TransactionModal({
    showForm,
    onCloseForm,
    form,
    onFormChange,
    onSubmit,
    categories,
    categoryLabels,
    accounts
}: TransactionModalProps) {
    if (!showForm) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }}
            onClick={onCloseForm}
        >
            <div
                style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '24px',
                    width: '100%',
                    maxWidth: '500px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                        {/* Dynamic title could be passed props or inferred */}
                        Транзакція
                    </h3>
                    <button onClick={onCloseForm} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                </div>

                <form onSubmit={onSubmit}>
                    <div style={{ display: 'grid', gap: '16px' }}>

                        {/* Type */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 500 }}>Тип операції</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => onFormChange({ ...form, type: 'income' })}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        borderRadius: '6px',
                                        border: '1px solid #e5e7eb',
                                        background: form.type === 'income' ? '#dcfce7' : 'white',
                                        color: form.type === 'income' ? '#166534' : 'inherit',
                                        fontWeight: form.type === 'income' ? 600 : 400,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Прихід
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onFormChange({ ...form, type: 'expense' })}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        borderRadius: '6px',
                                        border: '1px solid #e5e7eb',
                                        background: form.type === 'expense' ? '#fee2e2' : 'white',
                                        color: form.type === 'expense' ? '#991b1b' : 'inherit',
                                        fontWeight: form.type === 'expense' ? 600 : 400,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Витрата
                                </button>
                            </div>
                        </div>

                        {/* Date */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 500 }}>Дата</label>
                            <input
                                type="date"
                                value={form.date}
                                onChange={(e) => onFormChange({ ...form, date: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                required
                            />
                        </div>

                        {/* Amount */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 500 }}>Сума</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={form.amount}
                                    onChange={(e) => onFormChange({ ...form, amount: e.target.value })}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                    required
                                    placeholder="0.00"
                                />
                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}>₴</span>
                            </div>
                        </div>

                        {/* Category */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 500 }}>Категорія</label>
                            <select
                                value={form.category}
                                onChange={(e) => onFormChange({ ...form, category: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                            >
                                {categories.map((catKey) => (
                                    <option key={catKey} value={catKey}>{categoryLabels[catKey] || catKey}</option>
                                ))}
                            </select>
                        </div>

                        {/* Account (Optional for Cash Shift context, but good to have) */}
                        {accounts && accounts.length > 0 && (
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 500 }}>Рахунок</label>
                                <select
                                    value={form.moneyAccountId}
                                    onChange={(e) => onFormChange({ ...form, moneyAccountId: e.target.value })}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                >
                                    <option value="">Основний (готівка)</option>
                                    {accounts.map((acc) => (
                                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Description */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 500 }}>Коментар</label>
                            <textarea
                                value={form.description}
                                onChange={(e) => onFormChange({ ...form, description: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', minHeight: '80px' }}
                                placeholder="Опис операції..."
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                            <button
                                type="button"
                                onClick={onCloseForm}
                                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', fontWeight: 500, cursor: 'pointer' }}
                            >
                                Скасувати
                            </button>
                            <button
                                type="submit"
                                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: 500, cursor: 'pointer' }}
                            >
                                Зберегти
                            </button>
                        </div>

                    </div>
                </form>
            </div>
        </div>
    );
}
