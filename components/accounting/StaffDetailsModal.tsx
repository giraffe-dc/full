
import React, { useState, useEffect } from "react";
import styles from "./Modal.module.css";

interface StaffDetailsModalProps {
    staffId: string;
    dateRange: { startDate: string, endDate: string };
    onClose: () => void;
}

export function StaffDetailsModal({ staffId, dateRange, onClose }: StaffDetailsModalProps) {
    const [activeTab, setActiveTab] = useState<'shifts' | 'receipts'>('shifts');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const query = new URLSearchParams(dateRange);
                const res = await fetch(`/api/accounting/staff/${staffId}/details?${query.toString()}`);
                const json = await res.json();
                if (json.staff) {
                    setData(json);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        if (staffId) {
            fetchData();
        }
    }, [staffId, dateRange]);

    if (!data && loading) return <div className={styles.modalOverlay}><div className={styles.modalContent}>Loading...</div></div>;
    if (!data) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: '900px' }}>
                <div className={styles.modalHeader}>
                    <div>
                        <h2 className={styles.modalTitle}>{data.staff.name}</h2>
                        <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>{data.staff.position} • {data.staff.phone}</p>
                    </div>
                    <button className={styles.closeButton} onClick={onClose}>×</button>
                </div>

                {/* Stats Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '8px' }}>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Виторг</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{data.stats.totalRevenue.toFixed(2)} ₴</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Кількість чеків</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{data.stats.checkCount}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Середній чек</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{data.stats.avgCheck.toFixed(2)} ₴</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Відпрацьовано</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{data.stats.totalWorkedTime}</div>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid #e2e8f0', marginBottom: '15px' }}>
                    <div
                        style={{ padding: '10px 0', cursor: 'pointer', borderBottom: activeTab === 'shifts' ? '2px solid #3b82f6' : 'none', color: activeTab === 'shifts' ? '#3b82f6' : '#64748b', fontWeight: 500 }}
                        onClick={() => setActiveTab('shifts')}
                    >
                        Зміни ({data.shifts.length})
                    </div>
                    <div
                        style={{ padding: '10px 0', cursor: 'pointer', borderBottom: activeTab === 'receipts' ? '2px solid #3b82f6' : 'none', color: activeTab === 'receipts' ? '#3b82f6' : '#64748b', fontWeight: 500 }}
                        onClick={() => setActiveTab('receipts')}
                    >
                        Чеки ({data.receipts.length})
                    </div>
                </div>

                <div className={styles.modalBody}>
                    {loading && <div style={{ textAlign: 'center', padding: '20px' }}>Updating...</div>}

                    {activeTab === 'shifts' && (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Початок</th>
                                    <th>Кінець</th>
                                    <th>Тривалість</th>
                                    <th>Статус</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.shifts.map((s: any) => (
                                    <tr key={s.id}>
                                        <td>{new Date(s.startTime).toLocaleString('uk-UA')}</td>
                                        <td>{s.endTime ? new Date(s.endTime).toLocaleString('uk-UA') : '—'}</td>
                                        <td>{s.duration}</td>
                                        <td>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem',
                                                backgroundColor: s.status === 'active' ? '#dcfce7' : '#f1f5f9',
                                                color: s.status === 'active' ? '#166534' : '#64748b'
                                            }}>
                                                {s.status === 'active' ? 'Активна' : 'Завершена'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {data.shifts.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: '#9ca3af' }}>Змін не знайдено</td></tr>}
                            </tbody>
                        </table>
                    )}

                    {activeTab === 'receipts' && (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>№ Чеку</th>
                                    <th>Час</th>
                                    <th>Метод</th>
                                    <th>Сума</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.receipts.map((r: any) => (
                                    <tr key={r.id}>
                                        <td>#{r.number}</td>
                                        <td>{new Date(r.date).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })} <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{new Date(r.date).toLocaleDateString('uk-UA')}</span></td>
                                        <td>
                                            {r.paymentMethod === 'cash' ? 'Готівка' : r.paymentMethod === 'card' ? 'Картка' : 'Змішана'}
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{r.total.toFixed(2)} ₴</td>
                                    </tr>
                                ))}
                                {data.receipts.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: '#9ca3af' }}>Чеків не знайдено</td></tr>}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
