import React, { useState } from 'react';
import { MoneyAccount } from '../../types/accounting';
import styles from './InvoicesSection.module.css'; // Reusing styles for now
import { useToast } from '../ui/ToastContext';

interface AccountsSectionProps {
    rows: MoneyAccount[];
    onRefresh: () => void;
}

export function AccountsSection({
    rows,
    onRefresh
}: AccountsSectionProps) {
    const toast = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingAccount, setEditingAccount] = useState<MoneyAccount | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        type: 'cash',
        initialBalance: '',
        currency: 'UAH',
        description: ''
    });

    const filteredRows = rows.filter((row) =>
        row.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatCurrency = (amount: number, currency: string = 'UAH') => {
        const formatted = Math.abs(amount).toFixed(2);
        const sign = amount < 0 ? '-' : '';
        return `${sign}${formatted} ${currency}`;
    };

    const getBalanceColor = (balance: number) => {
        if (balance > 0) return styles.balancePositive;
        if (balance < 0) return styles.balanceNegative;
        return styles.balanceNeutral;
    };

    const totalBalance = rows.reduce((sum, row) => sum + row.balance, 0);

    // Handlers
    const handleOpenAdd = () => {
        setEditingAccount(null);
        setFormData({
            name: '',
            type: 'cash',
            initialBalance: '0',
            currency: 'UAH',
            description: ''
        });
        setShowForm(true);
    };

    const handleOpenEdit = (account: MoneyAccount) => {
        setEditingAccount(account);
        setFormData({
            name: account.name,
            type: account.type,
            // @ts-ignore - initialBalance might be missing in type def yet, but API returns it
            initialBalance: String(account.initialBalance !== undefined ? account.initialBalance : account.balance),
            currency: account.currency || 'UAH',
            description: account.description || ''
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Видалити цей рахунок?')) return;
        try {
            const res = await fetch(`/api/accounting/accounts/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Рахунок видалено');
                onRefresh();
            } else {
                toast.error('Помилка видалення');
            }
        } catch (e) {
            console.error(e);
            toast.error('Помилка сервера');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingAccount ? `/api/accounting/accounts/${editingAccount.id}` : '/api/accounting/accounts';
            const method = editingAccount ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success(editingAccount ? 'Рахунок оновлено' : 'Рахунок створено');
                setShowForm(false);
                onRefresh();
            } else {
                toast.error('Помилка збереження');
            }
        } catch (e) {
            console.error(e);
            toast.error('Помилка сервера');
        }
    };

    return (
        <section className={styles.card}>
            <div className={styles.headerRow}>
                <div className={styles.titleBlock}>
                    <h2 className={styles.title}>Рахунки (Гаманці)</h2>
                    <span className={styles.count}>{rows.length}</span>
                </div>
                <div className={styles.toolbarRight}>
                    <button
                        className={`${styles.toolbarButton} ${styles.buttonPrimary}`}
                        type="button"
                        onClick={handleOpenAdd}
                    >
                        ➕ Додати рахунок
                    </button>
                </div>
            </div>

            <div className={styles.toolbarRow}>
                <input
                    type="text"
                    placeholder="🔍 Швидкий пошук"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={styles.searchInput}
                />
            </div>

            {showForm && (
                <div className={styles.formSection} style={{
                    marginBottom: '24px',
                    padding: '24px',
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    border: '1px solid #e5e7eb'
                }}>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '1.25em', fontWeight: 600, margin: 0 }}>
                                {editingAccount ? 'Редагувати рахунок' : 'Новий рахунок'}
                            </h3>
                            <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: '1.5em', cursor: 'pointer', color: '#6b7280' }}>
                                &times;
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85em', color: '#4b5563', marginBottom: '4px' }}>Назва *</label>
                                <input
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                    placeholder="Наприклад: Основна каса"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85em', color: '#4b5563', marginBottom: '4px' }}>Тип *</label>
                                <select
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                >
                                    <option value="cash">Готівка</option>
                                    <option value="card">Карта / Рахунок</option>
                                    <option value="safe">Сейф</option>
                                    <option value="other">Інше</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85em', color: '#4b5563', marginBottom: '4px' }}>Початковий баланс (Старт)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.initialBalance}
                                    onChange={e => setFormData({ ...formData, initialBalance: e.target.value })}
                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                />
                                <div style={{ fontSize: '0.7em', color: '#9ca3af', marginTop: '4px' }}>
                                    Ця сума буде додана до розрахованого балансу
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85em', color: '#4b5563', marginBottom: '4px' }}>Валюта</label>
                                <select
                                    value={formData.currency}
                                    onChange={e => setFormData({ ...formData, currency: e.target.value })}
                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                >
                                    <option value="UAH">UAH</option>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.85em', color: '#4b5563', marginBottom: '4px' }}>Опис</label>
                            <input
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                placeholder="Додаткова інформація..."
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button type="button" onClick={() => setShowForm(false)} className={styles.actionButton} style={{ width: 'auto', padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white' }}>Скасувати</button>
                            <button type="submit" className={styles.buttonPrimary} style={{ width: 'auto', padding: '8px 24px' }}>Зберегти</button>
                        </div>
                    </form>
                </div>
            )}

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.nameColumn}>Назва</th>
                            <th className={styles.typeColumn}>Тип</th>
                            <th className={styles.typeColumn}>Опис</th>
                            <th className={styles.balanceColumn}>Баланс</th>
                            <th className={styles.actionsColumn}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRows.length === 0 ? (
                            <tr>
                                <td colSpan={5} className={styles.noData}>
                                    Немає даних для відображення
                                </td>
                            </tr>
                        ) : (
                            filteredRows.map((row) => (
                                <tr key={row.id}>
                                    <td className={styles.nameColumn}>
                                        <div className={styles.nameCell}>{row.name}</div>
                                    </td>
                                    <td className={styles.typeColumn}>
                                        {row.type === 'cash' ? '💵 Готівка' : row.type === 'card' ? '💳 Рахунок' : row.type === 'safe' ? '🔒 Сейф' : '📦 ' + row.type}
                                    </td>
                                    <td className={styles.typeColumn} style={{ color: '#6b7280', fontSize: '0.9em' }}>
                                        {row.description}
                                    </td>
                                    <td className={`${styles.balanceColumn} ${getBalanceColor(row.balance)}`}>
                                        {formatCurrency(row.balance, row.currency)}
                                    </td>
                                    <td className={styles.actionsColumn}>
                                        <div className={styles.actions}>
                                            <button
                                                className={styles.actionButton}
                                                onClick={() => handleOpenEdit(row)}
                                                title="Редагувати"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className={`${styles.actionButton} ${styles.actionDelete}`}
                                                onClick={() => handleDelete(row.id)}
                                                title="Видалити"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                        {filteredRows.length > 0 && (
                            <tr className={styles.totalRow}>
                                <td className={styles.nameColumn}>
                                    <strong>Разом (UAH)</strong>
                                </td>
                                <td colSpan={2}></td>
                                <td className={`${styles.balanceColumn} ${getBalanceColor(totalBalance)}`}>
                                    <strong>{formatCurrency(totalBalance)} ₴</strong>
                                </td>
                                <td></td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
