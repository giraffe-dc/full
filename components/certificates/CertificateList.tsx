"use client";

import { useState, useEffect, useMemo } from 'react';
import styles from '../../app/accounting/certificates/page.module.css';
import { useToast } from '../../components/ui/ToastContext';
import { Certificate } from '../../types/cash-register';

export function CertificateList() {
    const toast = useToast();
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'active' | 'used' | 'expired' | 'all'>('all');

    useEffect(() => {
        fetchCertificates();
    }, [statusFilter]);

    const fetchCertificates = async () => {
        setLoading(true);
        try {
            const url = statusFilter === 'all' 
                ? '/api/certificates' 
                : `/api/certificates?status=${statusFilter}`;
            
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
                setCertificates(data.data);
            }
        } catch (e) {
            console.error(e);
            toast.error("Помилка завантаження сертифікатів");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Ви впевнені, що хочете видалити цей сертифікат? Ця дія незворотна.")) return;
        try {
            const res = await fetch(`/api/certificates/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success("Сертифікат видалено");
                fetchCertificates();
            } else {
                toast.error("Помилка видалення");
            }
        } catch (e) {
            toast.error("Помилка");
        }
    };

    const handleDeactivate = async (id: string) => {
        if (!confirm("Анулювати сертифікат?")) return;
        try {
            const res = await fetch(`/api/certificates/${id}`, { 
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'expired' })
            });
            if (res.ok) {
                toast.success("Сертифікат анульовано");
                fetchCertificates();
            } else {
                toast.error("Помилка оновлення");
            }
        } catch (e) {
            toast.error("Помилка");
        }
    }

    const totals = useMemo(() => {
        const activeCount = certificates.filter(c => c.status === 'active').length;
        const usedCount = certificates.filter(c => c.status === 'used').length;
        const totalAmount = certificates.reduce((sum, c) => sum + (c.pricePaid || 0), 0);
        const outstandingBalance = certificates.reduce((sum, c) => sum + (c.status === 'active' && c.type === 'amount' ? (c.balance || 0) : 0), 0);

        return { activeCount, usedCount, totalAmount, outstandingBalance };
    }, [certificates]);

    return (
        <>
            <div className={styles.header}>
                <h2>📊 Аналітика виданих сертифікатів</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as any)}
                        className={styles.select}
                        style={{ margin: 0, width: 'auto' }}
                    >
                        <option value="all">Всі статуси</option>
                        <option value="active">Активні</option>
                        <option value="used">Використані</option>
                        <option value="expired">Анульовані/Прострочені</option>
                    </select>
                </div>
            </div>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Всього продано (₴)</span>
                    <span className={styles.statValue} style={{ color: '#059669' }}>{totals.totalAmount.toFixed(2)} ₴</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Залишок зобов'язань</span>
                    <span className={styles.statValue} style={{ color: '#dc2626' }}>{totals.outstandingBalance.toFixed(2)} ₴</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Активні сертифікати</span>
                    <span className={styles.statValue} style={{ color: '#2563eb' }}>{totals.activeCount} шт.</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Використані</span>
                    <span className={styles.statValue}>{totals.usedCount} шт.</span>
                </div>
            </div>

            <div className={styles.tableCard}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Код</th>
                            <th>Клієнт</th>
                            <th>Тип / Номінал</th>
                            <th>Залишок</th>
                            <th>Статус</th>
                            <th>Створено</th>
                            <th>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>Завантаження...</td></tr>
                        ) : certificates.length === 0 ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>Сертифікати відсутні</td></tr>
                        ) : certificates.map(c => (
                            <tr key={c.id}>
                                <td><strong style={{ letterSpacing: '1px' }}>{c.code}</strong></td>
                                <td>{c.clientName || 'Невідомий'}</td>
                                <td>
                                    {c.type === 'amount' && `Сума: ${c.amount} ₴`}
                                    {c.type === 'visits' && `Відвідування: ${c.visitsTotal} шт.`}
                                    {c.type === 'service' && `Послуга: ${c.serviceName}`}
                                </td>
                                <td>
                                    {c.type === 'amount' && <strong style={{ color: '#059669' }}>{c.balance} ₴</strong>}
                                    {c.type === 'visits' && <strong>Залишилось: {(c.visitsTotal || 0) - (c.visitsUsed || 0)} шт.</strong>}
                                    {c.type === 'service' && (c.status === 'active' ? '1 шт.' : '0 шт.')}
                                </td>
                                <td>
                                    <span className={
                                        c.status === 'active' ? styles.badgeGreen : 
                                        c.status === 'used' ? styles.badgeBlue : 
                                        styles.badgeRed
                                    } style={c.status === 'expired' ? { backgroundColor: '#fee2e2', color: '#ef4444', padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 } : {}}>
                                        {c.status === 'active' ? 'Активний' : c.status === 'used' ? 'Використаний' : 'Анульований'}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ fontSize: '0.85rem' }}>{new Date(c.createdAt).toLocaleDateString('uk-UA')}</div>
                                    {c.expiresAt && <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>До: {new Date(c.expiresAt).toLocaleDateString('uk-UA')}</div>}
                                </td>
                                <td>
                                    <div className={styles.actions}>
                                        {c.status === 'active' && (
                                            <button onClick={() => handleDeactivate(c.id!)} className={styles.btnIconDelete} title="Анулювати">
                                                🚫
                                            </button>
                                        )}
                                        <button onClick={() => handleDelete(c.id!)} className={styles.btnIconDelete} title="Видалити">
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
