"use client";

import { useState, useEffect } from 'react';
import { Receipt } from '../../../types/cash-register';
import styles from './page.module.css';

export default function AccountingChecksPage() {
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'receipt' | 'history'>('receipt');
    const [statusFilter, setStatusFilter] = useState<'open' | 'paid'>('paid');

    // Edit State
    const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
    const [paymentAmounts, setPaymentAmounts] = useState({ cash: 0, card: 0, certificate: 0 });

    useEffect(() => {
        fetchReceipts();
    }, [date, statusFilter]);

    const fetchReceipts = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/accounting/checks?date=${date}&status=${statusFilter}`);
            const data = await res.json();
            if (data.success) {
                setReceipts(data.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Ви впевнені, що хочете видалити цей чек? Ця дія незворотна.")) return;
        try {
            const res = await fetch(`/api/accounting/checks?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchReceipts();
            } else {
                alert("Помилка видалення");
            }
        } catch (e) {
            alert("Помилка");
        }
    };

    const handleEditClick = (receipt: Receipt) => {
        setEditingReceipt(receipt);
        if (receipt.paymentDetails) {
            setPaymentAmounts({
                cash: receipt.paymentDetails.cash || 0,
                card: receipt.paymentDetails.card || 0,
                certificate: receipt.paymentDetails.certificate || 0
            });
        } else {
            // Infer
            if (receipt.paymentMethod === 'cash') {
                setPaymentAmounts({ cash: receipt.total, card: 0, certificate: 0 });
            } else if (receipt.paymentMethod === 'card') {
                setPaymentAmounts({ cash: 0, card: receipt.total, certificate: 0 });
            } else {
                setPaymentAmounts({ cash: 0, card: 0, certificate: 0 });
            }
        }
    };

    const handleSaveEdit = async () => {
        if (!editingReceipt) return;

        // Validation: sum should match total (optional warning)
        const totalPaid = paymentAmounts.cash + paymentAmounts.card + paymentAmounts.certificate;
        if (Math.abs(totalPaid - editingReceipt.total) > 0.01) {
            if (!confirm(`Сума оплати (${totalPaid}₴) не співпадає з сумою чека (${editingReceipt.total}₴). Продовжити?`)) {
                return;
            }
        }

        try {
            const res = await fetch('/api/accounting/checks', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingReceipt.id,
                    paymentDetails: paymentAmounts,
                    user: 'Admin'
                })
            });
            if (res.ok) {
                setEditingReceipt(null);
                fetchReceipts();
            } else {
                alert("Помилка збереження");
            }
        } catch (e) {
            alert("Помилка");
        }
    };

    const handleExpandRow = (id: string) => {
        if (expandedRow === id) {
            setExpandedRow(null);
        } else {
            setExpandedRow(id);
            setActiveTab('receipt');
        }
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>🧾 Чеки</h1>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as any)}
                        className={styles.select}
                        style={{ margin: 0, width: 'auto' }}
                    >
                        <option value="all">Всі статуси</option>
                        <option value="open">Не оплачені</option>
                        <option value="paid">Оплачені</option>
                    </select>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className={styles.datePicker}
                    />
                </div>
            </div>

            <div className={styles.tableCard}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Офіціант/Стіл</th>
                            <th>Час</th>
                            <th>Оплачено</th>
                            <th>Тип</th>
                            <th>Статус</th>
                            <th>Знижка</th>
                            <th>Прибуток</th>
                            <th>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        {receipts.length === 0 ? (
                            <tr><td colSpan={9} style={{ textAlign: 'center', padding: '20px' }}>Чеки відсутні за цей день</td></tr>
                        ) : receipts.map(r => (
                            <>
                                <tr key={r.id}>
                                    <td>{(r as any).type === 'check' ? '-' : r.receiptNumber}</td>
                                    <td>{r.waiterName || r.waiter}</td>
                                    <td>{new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                    <td>{r.total.toFixed(2)} ₴</td>
                                    <td>
                                        {(r as any).status === 'open' ? (
                                            <span style={{ color: '#9ca3af' }}>—</span>
                                        ) : (
                                            <span className={r.paymentMethod === 'cash' ? styles.badgeGreen : styles.badgeBlue}>
                                                {r.paymentMethod === 'cash' ? 'Готівка' : r.paymentMethod === 'card' ? 'Карта' : 'Змішана'}
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        {(r as any).status === 'open' ? (
                                            <span style={{
                                                backgroundColor: '#fee2e2',
                                                color: '#ef4444',
                                                padding: '4px 8px',
                                                borderRadius: '12px',
                                                fontSize: '0.8rem',
                                                fontWeight: 600
                                            }}>
                                                Не оплачено
                                            </span>
                                        ) : (
                                            <span style={{
                                                backgroundColor: '#dcfce7',
                                                color: '#166534',
                                                padding: '4px 8px',
                                                borderRadius: '12px',
                                                fontSize: '0.8rem',
                                                fontWeight: 600
                                            }}>
                                                Оплачено
                                            </span>
                                        )}
                                    </td>
                                    <td>{(r.items.reduce((acc, i) => acc + (i.discount || 0), 0)).toFixed(2)} ₴</td>
                                    <td>{(r as any).status === 'open' ? '0.00' : r.total.toFixed(2)} ₴</td>
                                    <td>
                                        <div className={styles.actions}>
                                            <button onClick={() => {
                                                if (expandedRow === r.id) setExpandedRow(null);
                                                else { setExpandedRow(r.id); setActiveTab('receipt'); }
                                            }} className={styles.btnLink}>
                                                {expandedRow === r.id ? 'Згорнути' : 'Деталі'}
                                            </button>
                                            {(r as any).status !== 'open' && (
                                                <>
                                                    <button onClick={() => handleEditClick(r)} className={styles.btnIcon}>✏️</button>
                                                    <button onClick={() => handleDelete(r.id)} className={styles.btnIconDelete}>🗑️</button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                {expandedRow === r.id && (
                                    <tr className={styles.expandedRow}>
                                        <td colSpan={9}>
                                            <div className={styles.detailsContainer}>
                                                <div className={styles.tabs}>
                                                    <div
                                                        className={activeTab === 'receipt' ? styles.activeTab : styles.tab}
                                                        onClick={() => setActiveTab('receipt')}
                                                    >
                                                        Рахунок
                                                    </div>
                                                    <div
                                                        className={activeTab === 'history' ? styles.activeTab : styles.tab}
                                                        onClick={() => setActiveTab('history')}
                                                    >
                                                        Історія
                                                    </div>
                                                </div>

                                                <div className={styles.tabContent}>
                                                    {activeTab === 'receipt' && (
                                                        <table className={styles.itemsTable}>
                                                            <thead>
                                                                <tr>
                                                                    <th>Товар</th>
                                                                    <th>Ціна</th>
                                                                    <th>Кількість</th>
                                                                    <th>Всього</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {r.items.map((item, idx) => (
                                                                    <tr key={idx}>
                                                                        <td>{item.serviceName}</td>
                                                                        <td>{item.price.toFixed(2)} ₴</td>
                                                                        <td>{item.quantity} шт.</td>
                                                                        <td>{item.subtotal.toFixed(2)} ₴</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )}

                                                    {activeTab === 'history' && (
                                                        <div className={styles.historySection}>
                                                            {r.history && r.history.length > 0 ? (
                                                                <ul className={styles.historyList}>
                                                                    {r.history.map((h, i) => (
                                                                        <li key={i} className={styles.historyItem}>
                                                                            <div className={styles.historyHeader}>
                                                                                <span className={styles.historyDate}>{new Date(h.date).toLocaleString('uk-UA')}</span>
                                                                                <span className={styles.historyAuthor}>{h.changedBy || 'System'}</span>
                                                                            </div>
                                                                            <div className={styles.historyBody}>
                                                                                <span className={styles.historyAction}>
                                                                                    {h.action === 'created' && '🧾 Чек створено'}
                                                                                    {h.action === 'update_items' && '🛒 Зміна товарів'}
                                                                                    {h.action === 'update_discount' && '🏷️ Зміна знижки'}
                                                                                    {h.action === 'update_comment' && '💬 Зміна коментаря'}
                                                                                    {h.action === 'update_guests' && '👥 Зміна кількості гостей'}
                                                                                    {h.action === 'update_payment' && '💳 Оплата'}
                                                                                    {!['created', 'update_items', 'update_discount', 'update_comment', 'update_guests', 'update_payment'].includes(h.action) && h.action}
                                                                                </span>

                                                                                {h.action === 'update_items' && h.previousDetails && h.newDetails && (
                                                                                    <div className={styles.historyDetails}>
                                                                                        <div className={styles.historyDiff}>
                                                                                            <span>Було: {(h.previousDetails as any[]).length} поз.</span>
                                                                                            <span>Stack: {(h.newDetails as any[]).length} поз.</span>
                                                                                        </div>
                                                                                    </div>
                                                                                )}

                                                                                {(h.action === 'update_discount' || h.action === 'update_guests') && (
                                                                                    <div className={styles.historyDiff}>
                                                                                        <span className={styles.oldValue}>{h.previousValue}</span>
                                                                                        <span className={styles.arrow}>→</span>
                                                                                        <span className={styles.newValue}>{h.newValue}</span>
                                                                                    </div>
                                                                                )}

                                                                                {h.action === 'update_comment' && (
                                                                                    <div className={styles.historyDiff}>
                                                                                        <span className={styles.oldValue}>"{h.previousValue || '(пусто)'}"</span>
                                                                                        <span className={styles.arrow}>→</span>
                                                                                        <span className={styles.newValue}>"{h.newValue}"</span>
                                                                                    </div>
                                                                                )}

                                                                                {h.action === 'created' && <div className={styles.historyNote}>{h.newValue}</div>}
                                                                            </div>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            ) : (
                                                                <p className={styles.emptyHistory}>Історія змін відсутня</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {editingReceipt && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h3>Редагування чека</h3>
                            <div className={styles.modalTotal}>
                                Сума: {editingReceipt.total}₴
                                <button onClick={() => setEditingReceipt(null)} className={styles.btnClose}>×</button>
                            </div>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.inputGroup}>
                                <label>Оплата готівкою</label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        type="number"
                                        value={paymentAmounts.cash}
                                        onChange={e => setPaymentAmounts({ ...paymentAmounts, cash: Number(e.target.value) })}
                                    />
                                    <span className={styles.currencySymbol}>₴</span>
                                </div>
                            </div>

                            <div className={styles.inputGroup}>
                                <label>Оплата карткою</label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        type="number"
                                        value={paymentAmounts.card}
                                        onChange={e => setPaymentAmounts({ ...paymentAmounts, card: Number(e.target.value) })}
                                    />
                                    <span className={styles.currencySymbol}>₴</span>
                                </div>
                            </div>

                            <div className={styles.inputGroup}>
                                <label>Оплата сертифікатом</label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        type="number"
                                        value={paymentAmounts.certificate}
                                        onChange={e => setPaymentAmounts({ ...paymentAmounts, certificate: Number(e.target.value) })}
                                    />
                                    <span className={styles.currencySymbol}>₴</span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.modalActions}>
                            <button onClick={() => setEditingReceipt(null)} className={styles.btnCancel}>Скасувати</button>
                            <button onClick={handleSaveEdit} className={styles.btnSave}>Застосувати</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
