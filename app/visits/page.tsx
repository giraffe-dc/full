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
    const [mounted, setMounted] = useState(false);

    // Form / Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
    
    // Data for selects
    const [products, setProducts] = useState<any[]>([]);
    const [halls, setHalls] = useState<any[]>([]);
    const [tables, setTables] = useState<any[]>([]);
    const [activeStaff, setActiveStaff] = useState<any[]>([]);

    useEffect(() => {
        setMounted(true);
    }, []);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        serviceName: "",
        productId: "",
        childName: "",
        parentName: "",
        childAge: "",
        phone: "",
        duration: "",
        startTime: "",
        endTime: "",
        paymentStatus: "unpaid" as 'paid' | 'unpaid',
        amount: "",
        hallId: "",
        tableId: "",
        staffId: ""
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

    const fetchInitialData = async () => {
        try {
            // 1. Fetch products
            const prodRes = await fetch("/api/accounting/products");
            const prodData = await prodRes.json();
            if (prodData.success) {
                // Filter by category "Розважальні послуги" (case insensitive)
                setProducts(prodData.data.filter((p: any) => 
                    p.category?.toLowerCase().includes("розважальні послуги") || 
                    p.category?.toLowerCase().includes("послуги")
                ));
            }

            // 2. Fetch halls (departments)
            const hallRes = await fetch("/api/cash-register/departments");
            const hallData = await hallRes.json();
            if (hallData.success) {
                setHalls(hallData.data);
            }

            // 3. Fetch active staff
            const staffRes = await fetch("/api/cash-register/shifts?activeStaff=true");
            const staffData = await staffRes.json();
            if (staffData.success) {
                setActiveStaff(staffData.data);
                if (staffData.data.length === 1) {
                    setFormData(prev => ({ ...prev, staffId: staffData.data[0].id }));
                }
            }
        } catch (e) {
            console.error("Error fetching initial data", e);
        }
    };

    useEffect(() => {
        if (showModal && !editingVisit) {
            fetchInitialData();
        }
    }, [showModal, editingVisit]);

    const fetchTables = async (hallId: string) => {
        if (!hallId) return;
        try {
            const res = await fetch(`/api/cash-register/tables?departmentId=${hallId}`);
            const data = await res.json();
            if (data.success) {
                // Show all tables but mark busy ones? 
                // User said "free table", so filter by free.
                setTables(data.data.filter((t: any) => t.status === 'free'));
            }
        } catch (e) {
            console.error("Error fetching tables", e);
        }
    };

    useEffect(() => {
        if (formData.hallId) {
            fetchTables(formData.hallId);
        } else {
            setTables([]);
        }
    }, [formData.hallId]);

    const handleProductChange = (productId: string) => {
        const product = products.find(p => p.id === productId || p._id === productId);
        if (product) {
            setFormData(prev => ({
                ...prev,
                productId,
                serviceName: product.name,
                amount: String(product.sellingPrice || product.price || 0)
            }));
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
            productId: "",
            childName: "",
            parentName: "",
            childAge: "",
            phone: "",
            duration: "",
            startTime: "",
            endTime: "",
            paymentStatus: "unpaid",
            amount: "",
            hallId: "",
            tableId: "",
            staffId: activeStaff.length === 1 ? activeStaff[0].id : ""
        });
        setShowModal(true);
    };

    const handleOpenEdit = (visit: Visit) => {
        setEditingVisit(visit);
        setFormData({
            date: visit.date,
            serviceName: visit.serviceName,
            productId: (visit as any).productId || "",
            childName: visit.childName,
            parentName: visit.parentName,
            childAge: String(visit.childAge),
            phone: visit.phone,
            duration: visit.duration,
            startTime: visit.startTime,
            endTime: visit.endTime,
            paymentStatus: visit.paymentStatus,
            amount: String(visit.amount),
            hallId: (visit as any).hallId || "",
            tableId: (visit as any).tableId || "",
            staffId: (visit as any).staffId || ""
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
                                <td>{v.date}</td>
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

            {mounted && showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h2>{editingVisit ? 'Редагувати відвідування' : 'Додати нове відвідування'}</h2>
                            <button onClick={() => setShowModal(false)} className={styles.btnClose}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className={styles.modalBody}>
                                <div className={styles.formGrid}>
                                    {/* Section 1: Location & Service */}
                                    <div className={styles.formSection}>
                                        <h3 className={styles.sectionTitle}>📍 Локація та Послуга</h3>
                                        <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                                            <label>Послуга (Товар)</label>
                                            <select
                                                className={styles.select}
                                                value={formData.productId}
                                                onChange={e => handleProductChange(e.target.value)}
                                                required
                                            >
                                                <option value="">Оберіть послугу</option>
                                                {products.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name} ({p.sellingPrice || p.price} ₴)</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>Зал</label>
                                            <select
                                                className={styles.select}
                                                value={formData.hallId}
                                                onChange={e => setFormData({ ...formData, hallId: e.target.value, tableId: "" })}
                                                required
                                            >
                                                <option value="">Оберіть залу</option>
                                                {halls.map(h => (
                                                    <option key={h.id} value={h.id}>{h.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>Стіл</label>
                                            <select
                                                className={styles.select}
                                                value={formData.tableId}
                                                onChange={e => setFormData({ ...formData, tableId: e.target.value })}
                                                required
                                                disabled={!formData.hallId}
                                            >
                                                <option value="">Оберіть стіл</option>
                                                {tables.map(t => (
                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {activeStaff.length > 1 ? (
                                            <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                                                <label>Співробітник (Хто створює)</label>
                                                <select
                                                    className={styles.select}
                                                    value={formData.staffId}
                                                    onChange={e => setFormData({ ...formData, staffId: e.target.value })}
                                                        required
                                                    >
                                                        <option value="">Оберіть співробітника</option>
                                                        {activeStaff.map(s => (
                                                            <option key={s.id} value={s.id}>{s.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ) : (
                                                <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                                                    <label>Дата відвідування</label>
                                                    <input
                                                        type="date"
                                                        className={styles.input}
                                                    value={formData.date}
                                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                                    required
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Section 2: Patient Info */}
                                    <div className={styles.formSection}>
                                        <h3 className={styles.sectionTitle}>👤 Дані клієнта</h3>
                                        <div className={styles.formGroup}>
                                            <label>Ім'я дитини</label>
                                            <input
                                                type="text"
                                                className={styles.input}
                                                placeholder="Введіть ім'я..."
                                                value={formData.childName}
                                                onChange={e => setFormData({ ...formData, childName: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>Вік</label>
                                            <input
                                                type="number"
                                                className={styles.input}
                                                placeholder="р."
                                                value={formData.childAge}
                                                onChange={e => setFormData({ ...formData, childAge: e.target.value })}
                                            />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>Ім'я батьків</label>
                                            <input
                                                type="text"
                                                className={styles.input}
                                                placeholder="ФІО"
                                                value={formData.parentName}
                                                onChange={e => setFormData({ ...formData, parentName: e.target.value })}
                                            />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>Телефон</label>
                                            <input
                                                type="tel"
                                                className={styles.input}
                                                placeholder="+380..."
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {/* Section 3: Time & Payment */}
                                    <div className={styles.formSection}>
                                        <h3 className={styles.sectionTitle}>⏱️ Час та Оплата</h3>
                                        <div className={styles.formGroup}>
                                            <label>Початок</label>
                                            <input
                                                type="time"
                                                className={styles.input}
                                                value={formData.startTime}
                                                onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>Тривалість</label>
                                            <select
                                                className={styles.select}
                                                value={formData.duration}
                                                onChange={e => setFormData({ ...formData, duration: e.target.value })}
                                                required
                                            >
                                                <option value="">Час</option>
                                                {Array.from({ length: 14 }).map((_, i) => {
                                                    const totalMinutes = (i + 1) * 30;
                                                    const h = Math.floor(totalMinutes / 60);
                                                    const m = totalMinutes % 60;
                                                    const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                                                    return (
                                                        <option key={value} value={value}>
                                                            {h > 0 ? `${h}г ` : ''}{m > 0 ? `${m}х` : ''}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>Кінець</label>
                                            <input
                                                type="time"
                                                className={styles.input}
                                                value={formData.endTime}
                                                readOnly
                                            />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>Сума (₴)</label>
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
                                                <option value="unpaid">🔴 Очікується</option>
                                                <option value="paid">🟢 Оплачено</option>
                                            </select>
                                        </div>
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
