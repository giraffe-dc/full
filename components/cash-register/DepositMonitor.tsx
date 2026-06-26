"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { useToast } from '@/components/ui/ToastContext';
import { formatCurrency } from '@/utils/format';

interface ActiveDeposit {
    id: string;
    tableName: string;
    total: number;
    paidAmount: number;
    depositMethod: string;
    createdAt: string;
    authorName: string;
}

interface DepositTransaction {
    id: string;
    category: string;
    amount: number;
    paymentMethod: string;
    comment: string;
    authorName: string;
    createdAt: string;
}

interface DepositStats {
    activeCount: number;
    totalActiveAmount: number;
    totalDeposited: number;
    totalRefunded: number;
}

interface DepositMonitorProps {
    onRefund?: (checkId: string) => void;
}

export const DepositMonitor = ({ onRefund }: DepositMonitorProps) => {
    const toast = useToast();
    const [activeDeposits, setActiveDeposits] = useState<ActiveDeposit[]>([]);
    const [transactions, setTransactions] = useState<DepositTransaction[]>([]);
    const [stats, setStats] = useState<DepositStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'active' | 'history'>('active');

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/cash-register/deposits');
            const data = await res.json();
            if (data.success) {
                setActiveDeposits(data.data.activeDeposits);
                setTransactions(data.data.transactions);
                setStats(data.data.stats);
            }
        } catch (error) {
            toast.error("Помилка завантаження передплат");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRefund = async (checkId: string) => {
        if (!confirm("Повернути передплату?")) return;
        try {
            const res = await fetch(`/api/cash-register/checks/${checkId}/deposit`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Передплату повернено!");
                fetchData();
                onRefund?.(checkId);
            } else {
                toast.error(data.error || "Помилка повернення");
            }
        } catch (error) {
            toast.error("Помилка повернення передплати");
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px' }}>
                Моніторинг передплат
            </h2>

            {/* Статистика */}
            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Активних</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#16a34a' }}>{stats.activeCount}</div>
                    </div>
                    <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Сума активних</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#2563eb' }}>{formatCurrency(stats.totalActiveAmount)}</div>
                    </div>
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Внесено всього</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#16a34a' }}>{formatCurrency(stats.totalDeposited)}</div>
                    </div>
                    <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Повернено</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#dc2626' }}>{formatCurrency(stats.totalRefunded)}</div>
                    </div>
                </div>
            )}

            {/* Таби */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <Button
                    variant={tab === 'active' ? 'primary' : 'outline'}
                    onClick={() => setTab('active')}
                >
                    Активні ({activeDeposits.length})
                </Button>
                <Button
                    variant={tab === 'history' ? 'primary' : 'outline'}
                    onClick={() => setTab('history')}
                >
                    Історія ({transactions.length})
                </Button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Завантаження...</div>
            ) : tab === 'active' ? (
                activeDeposits.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Немає активних передплат</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                <th style={{ textAlign: 'left', padding: '8px' }}>Стіл</th>
                                <th style={{ textAlign: 'right', padding: '8px' }}>Чек</th>
                                <th style={{ textAlign: 'right', padding: '8px' }}>Передплата</th>
                                <th style={{ textAlign: 'center', padding: '8px' }}>Метод</th>
                                <th style={{ textAlign: 'left', padding: '8px' }}>Касир</th>
                                <th style={{ textAlign: 'left', padding: '8px' }}>Дата</th>
                                <th style={{ textAlign: 'center', padding: '8px' }}>Дія</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeDeposits.map(d => (
                                <tr key={d.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '8px' }}>{d.tableName}</td>
                                    <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(d.total)}</td>
                                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>{formatCurrency(d.paidAmount)}</td>
                                    <td style={{ padding: '8px', textAlign: 'center' }}>{d.depositMethod === 'cash' ? '💵' : '💳'}</td>
                                    <td style={{ padding: '8px' }}>{d.authorName}</td>
                                    <td style={{ padding: '8px' }}>{new Date(d.createdAt).toLocaleString('uk-UA')}</td>
                                    <td style={{ padding: '8px', textAlign: 'center' }}>
                                        <Button variant="outline" onClick={() => handleRefund(d.id)} style={{ fontSize: '0.8rem', padding: '4px 8px' }}>
                                            Повернути
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )
            ) : (
                transactions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Немає транзакцій</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                <th style={{ textAlign: 'left', padding: '8px' }}>Тип</th>
                                <th style={{ textAlign: 'right', padding: '8px' }}>Сума</th>
                                <th style={{ textAlign: 'center', padding: '8px' }}>Метод</th>
                                <th style={{ textAlign: 'left', padding: '8px' }}>Опис</th>
                                <th style={{ textAlign: 'left', padding: '8px' }}>Дата</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map(t => (
                                <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '8px' }}>
                                        <span style={{ color: t.category === 'deposit' ? '#16a34a' : '#dc2626', fontWeight: 500 }}>
                                            {t.category === 'deposit' ? 'Передплата' : 'Повернення'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: t.category === 'deposit' ? '#16a34a' : '#dc2626' }}>
                                        {t.category === 'deposit' ? '+' : '-'}{formatCurrency(t.amount)}
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'center' }}>{t.paymentMethod === 'cash' ? '💵' : '💳'}</td>
                                    <td style={{ padding: '8px' }}>{t.comment}</td>
                                    <td style={{ padding: '8px' }}>{new Date(t.createdAt).toLocaleString('uk-UA')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )
            )}
        </div>
    );
};
