"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Visit } from '@/types/accounting';
import styles from './page.module.css';
import { useToast } from '@/components/ui/ToastContext';
import { Preloader } from '@/components/ui/Preloader';
import { DateRangePicker } from '@/components/ui/DateRangePicker';

export default function VisitingTimePage() {
    const router = useRouter();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [visits, setVisits] = useState<Visit[]>([]);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [user, setUser] = useState<any>(null);

    // Form / Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        serviceName: "",
        childName: "",
        parentName: "",
        childAge: "",
        phone: "",
        duration: "",
        startTime: "",
        endTime: "",
        paymentStatus: "unpaid" as 'paid' | 'unpaid',
        amount: ""
    });

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch("/api/auth/me");
                const data = await res.json();
                if (data.authenticated) {
                    setUser(data.user);
                } else {
                    router.push('/login');
                }
            } catch (e) {
                router.push('/login');
            }
        };
        checkAuth();
    }, [router]);

    const fetchVisits = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/visits?startDate=${startDate}&endDate=${endDate}`);
            const data = await res.json();
            if (data.success) {
                setVisits(data.data);
            }
        } catch (e) {
            console.error(e);
            toast.error("Помилка завантаження даних");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchVisits();
        }
    }, [user, startDate, endDate]);

    const handleOpenAdd = () => {
        setEditingVisit(null);
        setFormData({
            date: new Date().toISOString().split('T')[0],
            serviceName: "",
            childName: "",
            parentName: "",
            childAge: "",
            phone: "",
            duration: "",
            startTime: "",
            endTime: "",
            paymentStatus: "unpaid",
            amount: ""
        });
        setShowModal(true);
    };

    const handleOpenEdit = (visit: Visit) => {
        setEditingVisit(visit);
        setFormData({
            date: visit.date,
            serviceName: visit.serviceName,
            childName: visit.childName,
            parentName: visit.parentName,
            childAge: String(visit.childAge),
            phone: visit.phone,
            duration: visit.duration,
            startTime: visit.startTime,
            endTime: visit.endTime,
            paymentStatus: visit.paymentStatus,
            amount: String(visit.amount)
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Ви впевнені, що хочете видалити цей запис?")) return;
        try {
            const res = await fetch(`/api/visits?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success("Запис видалено");
                fetchVisits();
            } else {
                toast.error("Помилка видалення");
            }
        } catch (e) {
            toast.error("Помилка");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = "/api/visits";
        const method = editingVisit ? 'PUT' : 'POST';
        const body = {
            ...formData,
            id: editingVisit?.id,
            childAge: Number(formData.childAge),
            amount: Number(formData.amount)
        };

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                toast.success(editingVisit ? "Запис оновлено" : "Запис додано");
                setShowModal(false);
                fetchVisits();
            } else {
                toast.error("Помилка збереження");
            }
        } catch (e) {
            toast.error("Помилка");
        }
    };

    // Auto-calculate end time
    useEffect(() => {
        if (formData.startTime && formData.duration) {
            const [startH, startM] = formData.startTime.split(':').map(Number);
            const [durH, durM] = formData.duration.split(':').map(Number);

            if (!isNaN(startH) && !isNaN(startM) && !isNaN(durH) && !isNaN(durM)) {
                let endM = startM + durM;
                let endH = startH + durH + Math.floor(endM / 60);
                endM = endM % 60;
                endH = endH % 24;

                const formattedEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

                if (formData.endTime !== formattedEndTime) {
                    setFormData(prev => ({ ...prev, endTime: formattedEndTime }));
                }
            }
        }
    }, [formData.startTime, formData.duration, formData.endTime]);

    const stats = useMemo(() => {
        const total = visits.length;
        const paid = visits.filter(v => v.paymentStatus === 'paid').reduce((acc, v) => acc + v.amount, 0);
        const unpaid = visits.filter(v => v.paymentStatus === 'unpaid').reduce((acc, v) => acc + v.amount, 0);
        return { total, paid, unpaid };
    }, [visits]);

    if (!user) return <Preloader message="Перевірка авторизації..." />;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>🕒 Час відвідування</h1>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <DateRangePicker
                        startDate={startDate}
                        endDate={endDate}
                        onChange={(s, e) => {
                            setStartDate(s);
                            setEndDate(e);
                        }}
                    />
                    <button onClick={handleOpenAdd} className={styles.btnAdd}>
                        + Додати відвідування
                    </button>
                </div>
            </div>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Всього відвідувань</span>
                    <span className={styles.statValue}>{stats.total}</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Оплачено</span>
                    <span className={styles.statValue} style={{ color: '#10b981' }}>{stats.paid.toFixed(2)} ₴</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Очікується оплата</span>
                    <span className={styles.statValue} style={{ color: '#ef4444' }}>{stats.unpaid.toFixed(2)} ₴</span>
                </div>
            </div>

            <div className={styles.tableCard}>
                {loading && <div className={styles.loadingOverlay}>Завантаження...</div>}
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Дата</th>
                            <th>Послуга</th>
                            <th>Дитина/Батьки</th>
                            <th>Вік</th>
                            <th>Телефон</th>
                            <th>Час перебування</th>
                            <th>Початок</th>
                            <th>Кінець</th>
                            <th>Статус</th>
                            <th>Сума</th>
                            <th>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visits.length === 0 ? (
                            <tr>
                                <td colSpan={11} className={styles.emptyState}>Записів не знайдено за обраний період</td>
                            </tr>
                        ) : visits.map(v => (
                            <tr key={v.id}>
                                <td>{new Date(v.date).toLocaleDateString('uk-UA')}</td>
                                <td>{v.serviceName}</td>
                                <td>
                                    <div>{v.childName}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{v.parentName}</div>
                                </td>
                                <td>{v.childAge} р.</td>
                                <td>{v.phone}</td>
                                <td>{v.duration}</td>
                                <td>{v.startTime}</td>
                                <td>{v.endTime}</td>
                                <td>
                                    <span className={v.paymentStatus === 'paid' ? styles.badgeGreen : styles.badgeRed}>
                                        {v.paymentStatus === 'paid' ? 'Оплачено' : 'Не оплачено'}
                                    </span>
                                </td>
                                <td style={{ fontWeight: 600 }}>{v.amount.toFixed(2)} ₴</td>
                                <td>
                                    <div className={styles.actions}>
                                        <button onClick={() => handleOpenEdit(v)} className={styles.btnIcon}>✏️</button>
                                        <button onClick={() => handleDelete(v.id)} className={`${styles.btnIcon} ${styles.btnDelete}`}>🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h2>{editingVisit ? 'Редагувати відвідування' : 'Додати нове відвідування'}</h2>
                            <button onClick={() => setShowModal(false)} className={styles.btnClose}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className={styles.modalBody}>
                                <div className={styles.formGrid}>
                                    <div className={styles.formGroup}>
                                        <label>Дата</label>
                                        <input
                                            type="date"
                                            className={styles.input}
                                            value={formData.date}
                                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Назва послуги</label>
                                        <input
                                            type="text"
                                            className={styles.input}
                                            placeholder="Наприклад: Лабіринт"
                                            value={formData.serviceName}
                                            onChange={e => setFormData({ ...formData, serviceName: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Ім'я дитини</label>
                                        <input
                                            type="text"
                                            className={styles.input}
                                            value={formData.childName}
                                            onChange={e => setFormData({ ...formData, childName: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Ім'я батьків</label>
                                        <input
                                            type="text"
                                            className={styles.input}
                                            value={formData.parentName}
                                            onChange={e => setFormData({ ...formData, parentName: e.target.value })}

                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Вік дитини</label>
                                        <input
                                            type="number"
                                            className={styles.input}
                                            value={formData.childAge}
                                            onChange={e => setFormData({ ...formData, childAge: e.target.value })}

                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Номер телефону</label>
                                        <input
                                            type="tel"
                                            className={styles.input}
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}

                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Початок відвідування</label>
                                        <input
                                            type="time"
                                            className={styles.input}
                                            value={formData.startTime}
                                            onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Час перебування</label>
                                        <select
                                            className={styles.select}
                                            value={formData.duration}
                                            onChange={e => setFormData({ ...formData, duration: e.target.value })}
                                            required
                                        >
                                            <option value="">Оберіть час</option>
                                            {Array.from({ length: 14 }).map((_, i) => {
                                                const totalMinutes = (i + 1) * 30;
                                                const h = Math.floor(totalMinutes / 60);
                                                const m = totalMinutes % 60;
                                                const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                                                return (
                                                    <option key={value} value={value}>
                                                        {h > 0 ? `${h} год ` : ''}{m > 0 ? `${m} хв` : ''}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Кінець відвідування</label>
                                        <input
                                            type="time"
                                            className={styles.input}
                                            value={formData.endTime}
                                            onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Сума до сплати</label>
                                        <input
                                            type="number"
                                            className={styles.input}
                                            value={formData.amount}
                                            onChange={e => setFormData({ ...formData, amount: e.target.value })}

                                        />
                                    </div>
                                    <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                                        <label>Статус оплати</label>
                                        <select
                                            className={styles.select}
                                            value={formData.paymentStatus}
                                            onChange={e => setFormData({ ...formData, paymentStatus: e.target.value as any })}
                                        >
                                            <option value="unpaid">Не оплачено</option>
                                            <option value="paid">Оплачено</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.modalFooter}>
                                <button type="button" onClick={() => setShowModal(false)} className={styles.btnCancel}>Скасувати</button>
                                <button type="submit" className={styles.btnSubmit}>Зберегти</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
