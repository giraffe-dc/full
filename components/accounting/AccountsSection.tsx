import React, { useState } from 'react';
import { MoneyAccount, Transaction } from '../../types/accounting';
import styles from './InvoicesSection.module.css'; // Reusing styles for now
import { useToast } from '../ui/ToastContext';
import { Modal } from '../ui/Modal';

interface AccountsSectionProps {
    rows: any[];
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

    // History State
    const [selectedAccountForHistory, setSelectedAccountForHistory] = useState<MoneyAccount | null>(null);
    const [historyTransactions, setHistoryTransactions] = useState<Transaction[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyFilters, setHistoryFilters] = useState({
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });
    const [endOfPeriodBalance, setEndOfPeriodBalance] = useState<number>(0);
    const [openingBalance, setOpeningBalance] = useState<number>(0);
    const [closingBalance, setClosingBalance] = useState<number>(0);
    const [periodTotals, setPeriodTotals] = useState({ income: 0, expense: 0, incasation: 0, safeBalance: 0 });

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

    const handleOpenHistory = async (account: MoneyAccount) => {
        setSelectedAccountForHistory(account);
        fetchHistory(account.id, historyFilters.startDate, historyFilters.endDate);
    };

    const fetchHistory = async (accountId: string, start: string, end: string) => {
        setHistoryLoading(true);
        try {
            const params = new URLSearchParams({
                moneyAccountId: accountId,
                startDate: start,
                endDate: end
            });
            const res = await fetch(`/api/accounting/transactions?${params.toString()}`);
            const data = await res.json();
            if (data.data) {
                setHistoryTransactions(data.data);
                setEndOfPeriodBalance(data.totals.balance);
                setPeriodTotals({
                    income: data.totals.income,
                    expense: data.totals.expense,
                    incasation: data.totals.incasation || 0,
                    safeBalance: data.totals.safeBalance || 0
                });
                setOpeningBalance(data.openingBalance || 0);
                setClosingBalance(data.closingBalance || 0);
            }
        } catch (e) {
            console.error(e);
            toast.error('Помилка завантаження історії');
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleHistoryFilterChange = (start: string, end: string) => {
        setHistoryFilters({ startDate: start, endDate: end });
        if (selectedAccountForHistory) {
            fetchHistory(selectedAccountForHistory.id, start, end);
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
                            <th style={{ textAlign: 'right' }}>Прихід</th>
                            <th style={{ textAlign: 'right' }}>Витрати</th>
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
                                    <td style={{ textAlign: 'right', color: '#059669', fontWeight: 500 }}>
                                        {row.periodIncome > 0 ? `+${row.periodIncome.toFixed(2)}` : '0.00'}
                                    </td>
                                    <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: 500 }}>
                                        {row.periodExpense > 0 ? `-${row.periodExpense.toFixed(2)}` : '0.00'}
                                    </td>
                                    <td className={`${styles.balanceColumn} ${getBalanceColor(row.balance)}`}>
                                        {formatCurrency(row.balance, row.currency)}
                                    </td>
                                    <td className={styles.actionsColumn}>
                                        <div className={styles.actions}>
                                            <button
                                                className={styles.actionButton}
                                                onClick={() => handleOpenHistory(row)}
                                                title="Історія транзакцій"
                                            >
                                                📜
                                            </button>
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
                                <td></td>
                                <td style={{ textAlign: 'right', color: '#059669', fontWeight: 700 }}>
                                    {rows.reduce((sum, r) => sum + (r.periodIncome || 0), 0).toFixed(2)}
                                </td>
                                <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: 700 }}>
                                    {rows.reduce((sum, r) => sum + (r.periodExpense || 0), 0).toFixed(2)}
                                </td>
                                <td className={`${styles.balanceColumn} ${getBalanceColor(totalBalance)}`}>
                                    <strong>{formatCurrency(totalBalance)} ₴</strong>
                                </td>
                                <td></td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* History Modal */}
            <Modal
                isOpen={!!selectedAccountForHistory}
                onClose={() => setSelectedAccountForHistory(null)}
                title={`Історія транзакцій: ${selectedAccountForHistory?.name}`}
                size="lg"
            >
                <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '0.85em', color: '#4b5563', fontWeight: 500 }}>Період з:</label>
                        <input
                            type="date"
                            value={historyFilters.startDate}
                            onChange={(e) => handleHistoryFilterChange(e.target.value, historyFilters.endDate)}
                            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '0.9em' }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '0.85em', color: '#4b5563', fontWeight: 500 }}>по:</label>
                        <input
                            type="date"
                            value={historyFilters.endDate}
                            onChange={(e) => handleHistoryFilterChange(historyFilters.startDate, e.target.value)}
                            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '0.9em' }}
                        />
                    </div>
                </div>

                <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                    {historyLoading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Завантаження історії...</div>
                    ) : historyTransactions.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Транзакцій не знайдено</div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                <tr>
                                    <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600 }}>Дата</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600 }}>Опис</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600 }}>Сума</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600 }}>Тип</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historyTransactions.map((t) => (
                                    <tr key={t._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: '10px 8px' }}>
                                            {new Date(t.date).toLocaleDateString('uk-UA')}<br />
                                            <small style={{ color: '#9ca3af' }}>{new Date(t.date).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</small>
                                        </td>
                                        <td style={{ padding: '10px 8px' }}>
                                            <div style={{ fontWeight: 500 }}>{t.description}</div>
                                            <small style={{ color: '#6b7280' }}>{t.category}</small>
                                        </td>
                                        <td style={{
                                            padding: '10px 8px',
                                            textAlign: 'right',
                                            fontWeight: 600,
                                            color: (t.type === 'income' || (t.type === 'incasation' || t.category === 'incasation' && selectedAccountForHistory?.type === 'safe')) ? '#059669' : '#dc2626'
                                        }}>
                                            {(t.type === 'income' || (t.type === 'incasation' || t.category === 'incasation' && selectedAccountForHistory?.type === 'safe')) ? '+' : '-'} {Number(t.amount).toFixed(2)}
                                        </td>
                                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                            <span style={{
                                                fontSize: '0.75em',
                                                padding: '2px 8px',
                                                borderRadius: '999px',
                                                backgroundColor: (t.type === 'income' || (t.type === 'incasation' || t.category === 'incasation' && selectedAccountForHistory?.type === 'safe')) ? '#ecfdf5' : '#fef2f2',
                                                color: (t.type === 'income' || (t.type === 'incasation' || t.category === 'incasation' && selectedAccountForHistory?.type === 'safe')) ? '#065f46' : '#991b1b',
                                                border: `1px solid ${(t.type === 'income' || (t.type === 'incasation' || t.category === 'incasation' && selectedAccountForHistory?.type === 'safe')) ? '#a7f3d0' : '#fecaca'}`
                                            }}>
                                                {t.type === 'income' ? 'Надходження' : t.type === 'incasation' ? 'Інкасація' : 'Витрата'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <div style={{ marginTop: '20px', padding: '16px', borderTop: '2px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: '#f9fafb', borderRadius: '0 0 12px 12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                        <div style={{ fontSize: '0.9em', color: '#6b7280' }}>
                            Залишок на початок: <strong style={{ color: '#111827' }}>{openingBalance.toFixed(2)} {selectedAccountForHistory?.currency}</strong>
                        </div>
                        <div style={{ display: 'flex', gap: '24px', margin: '4px 0', padding: '8px 0', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
                            <div style={{ fontSize: '0.9em' }}>
                                <div style={{ color: '#6b7280', fontSize: '0.8em', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Прихід</div>
                                <strong style={{ color: '#059669', fontSize: '1.1em' }}>+ {selectedAccountForHistory?.type === 'safe' ? periodTotals.incasation.toFixed(2) : periodTotals.income.toFixed(2)}</strong>
                            </div>
                            <div style={{ fontSize: '0.9em' }}>
                                <div style={{ color: '#6b7280', fontSize: '0.8em', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Витрати</div>
                                <strong style={{ color: '#dc2626', fontSize: '1.1em' }}>-{selectedAccountForHistory?.type === 'cash' ? (periodTotals.expense + periodTotals.incasation).toFixed(2) : periodTotals.expense.toFixed(2)}</strong>
                            </div>
                            {/* Added Incasation summary */}
                            {/* {periodTotals.incasation > 0 && (
                                <div style={{ fontSize: '0.9em' }}>
                                    <div style={{ color: '#6b7280', fontSize: '0.8em', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Інкасація</div>
                                    <strong style={{ color: selectedAccountForHistory?.type === 'safe' ? '#059669' : '#dc2626', fontSize: '1.1em' }}>
                                        {selectedAccountForHistory?.type === 'safe' ? '+' : '-'}{periodTotals.incasation.toFixed(2)}
                                    </strong>
                                </div>
                            )} */}
                            <div style={{ fontSize: '0.9em' }}>
                                <div style={{ color: '#6b7280', fontSize: '0.8em', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Оборот</div>
                                {/* Calculate Net Change (Turnover) including Incasation */}
                                {(() => {
                                    const turnover = periodTotals.income - periodTotals.expense +
                                        (selectedAccountForHistory?.type === 'safe' ? periodTotals.incasation : -periodTotals.incasation);

                                    return (
                                        <strong style={{ color: turnover >= 0 ? '#059669' : '#dc2626', fontSize: '1.1em' }}>
                                            {turnover >= 0 ? '+' : ''}{turnover.toFixed(2)}
                                        </strong>
                                    );
                                })()}
                            </div>
                        </div>
                        <div style={{ fontSize: '1rem', color: '#111827' }}>
                            Залишок на кінець: <strong>{selectedAccountForHistory?.type === 'safe' ? periodTotals.safeBalance.toFixed(2) : closingBalance.toFixed(2)} {selectedAccountForHistory?.currency}</strong>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '24px' }}>
                        <div style={{ fontSize: '0.85em', color: '#6b7280' }}>Поточний баланс:</div>
                        <div style={{ fontSize: '1.2em', fontWeight: 700 }}>
                            <span className={getBalanceColor(selectedAccountForHistory?.balance || 0)}>
                                {formatCurrency(selectedAccountForHistory?.balance || 0, selectedAccountForHistory?.currency)}
                            </span>
                        </div>
                        <div style={{ fontSize: '0.7em', color: '#9ca3af', maxWidth: '180px' }}>
                            * Включає всі операції до поточного моменту
                        </div>
                    </div>
                </div>
            </Modal>
        </section>
    );
}
