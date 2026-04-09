"use client";

import { useState, useEffect, useMemo, JSX } from 'react';
import { DateRangePicker } from '../../../components/ui/DateRangePicker';
import { Receipt } from '../../../types/cash-register';
import styles from './page.module.css';
import { useToast } from '../../../components/ui/ToastContext';

const renderItemsDiff = (prev: any[], next: any[]) => {
    if (!Array.isArray(prev) || !Array.isArray(next)) return null;
    const prevMap = new Map(prev.map(i => [i.serviceId, i]));
    const nextMap = new Map(next.map(i => [i.serviceId, i]));
    const changes: JSX.Element[] = [];

    // Added or Modified
    next.forEach((newItem, idx) => {
        const prevItem = prevMap.get(newItem.serviceId);
        if (!prevItem) {
            changes.push(<div key={`add-${newItem.serviceId}-${idx}`} className={styles.diffAdded}>➕ Додано: {newItem.serviceName} (+{newItem.quantity} шт.)</div>);
        } else if (prevItem.quantity !== newItem.quantity) {
            changes.push(<div key={`mod-${newItem.serviceId}-${idx}`} className={styles.historyDiff}>📝 Змінено: {newItem.serviceName} ({prevItem.quantity} шт. → {newItem.quantity} шт.)</div>);
        }
    });

    // Removed
    prev.forEach((prevItem, idx) => {
        if (!nextMap.has(prevItem.serviceId)) {
            changes.push(<div key={`rm-${prevItem.serviceId}-${idx}`} className={styles.diffRemoved}>❌ Видалено: {prevItem.serviceName} ({prevItem.quantity} шт.)</div>);
        }
    });

    if (changes.length === 0) {
        return <div className={styles.historyDiff}>Змінилися інші параметри позицій (наприклад, знижка)</div>;
    }

    return <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>{changes}</div>;
};

export default function AccountingChecksPage() {
    const toast = useToast();
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'receipt' | 'history'>('receipt');
    const [statusFilter, setStatusFilter] = useState<'open' | 'paid' | 'all'>('all');

    // Edit State
    const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
    const [paymentAmounts, setPaymentAmounts] = useState({ cash: 0, card: 0, certificate: 0 });

    useEffect(() => {
        fetchReceipts();
    }, [startDate, endDate, statusFilter]);

    const fetchReceipts = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/accounting/checks?startDate=${startDate}&endDate=${endDate}&status=${statusFilter}`);
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
                toast.success("Чек видалено");
                fetchReceipts();
            } else {
                toast.error("Помилка видалення");
            }
        } catch (e) {
            toast.error("Помилка");
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
                toast.success("Чек оновлено");
                setEditingReceipt(null);
                fetchReceipts();
            } else {
                toast.error("Помилка збереження");
            }
        } catch (e) {
            toast.error("Помилка");
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

    const totals = useMemo(() => {
        const net = receipts.reduce((acc, r) => acc + ((r as any).status === 'open' ? 0 : (r.total || 0)), 0);
        const discount = receipts.reduce((acc, r) => acc + (r.items?.reduce((sum, item) => sum + (item?.discount || 0), 0) || 0), 0);
        const gross = net + discount;

        const card = receipts.filter(r => (r as any).status !== 'open' && r.paymentMethod === 'card').reduce((acc, r) => acc + (r.total || 0), 0);
        const cash = receipts.filter(r => (r as any).status !== 'open' && r.paymentMethod === 'cash').reduce((acc, r) => acc + (r.total || 0), 0);
        const mixed = receipts.filter(r => (r as any).status !== 'open' && r.paymentMethod === 'mixed').reduce((acc, r) => acc + (r.total || 0), 0);

        return { net, discount, gross, card, cash, mixed };
    }, [receipts]);

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
                    <DateRangePicker
                        startDate={startDate}
                        endDate={endDate}
                        onChange={(s, e) => {
                            setStartDate(s);
                            setEndDate(e);
                        }}
                    />
                </div>
            </div>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Всього оплачено</span>
                    <span className={styles.statValue}>{totals.net.toFixed(2)} ₴</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Всього прибуто</span>
                    <span className={styles.statValue} style={{ color: '#2563eb' }}>{totals.gross.toFixed(2)} ₴</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Знижка</span>
                    <span className={styles.statValue} style={{ color: '#dc2626' }}>{totals.discount.toFixed(2)} ₴</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>По типах оплати</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <span style={{ color: '#6b7280' }}>Готівка:</span>
                            <span style={{ fontWeight: 600 }}>{totals.cash.toFixed(2)} ₴</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <span style={{ color: '#6b7280' }}>Картка:</span>
                            <span style={{ fontWeight: 600 }}>{totals.card.toFixed(2)} ₴</span>
                        </div>
                        {totals.mixed > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: '#6b7280' }}>Змішана:</span>
                                <span style={{ fontWeight: 600 }}>{totals.mixed.toFixed(2)} ₴</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className={styles.tableCard}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Офіціант/Стіл</th>
                            <th>Відкрито</th>
                            <th>Закрито</th>
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
                            <tr><td colSpan={10} style={{ textAlign: 'center', padding: '20px' }}>Чеки відсутні за цей день</td></tr>
                        ) : receipts.map(r => (
                            <>
                                <tr key={r.id}>
                                    <td>{(r as any).type === 'check' ? '-' : r.receiptNumber}</td>
                                    <td>{r.waiterName || r.waiter}</td>
                                    <td>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }) : '-'}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                            {new Date(r.createdAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>
                                    <td>
                                        {(r as any).status === 'paid' && (r as any).updatedAt ? (
                                            <>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                                                    {new Date((r as any).updatedAt).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                                    {new Date((r as any).updatedAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </>
                                        ) : (
                                            <span style={{ color: '#9ca3af' }}>—</span>
                                        )}
                                    </td>
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
                                    <td>{(r.items ? r.items.reduce((acc, i) => acc + (i.discount || 0), 0) : 0).toFixed(2)} ₴</td>
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
                                        <td colSpan={10}>
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
                                                    <div
                                                        className={styles.newValue}
                                                    >
                                                        {r.comment}
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
                                                                {r.items && r.items.map((item, idx) => (
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
                                                                                        {renderItemsDiff(h.previousDetails as any[], h.newDetails as any[])}
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
