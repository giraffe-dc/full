"use client";

import { useState, useEffect } from 'react';
import styles from '../../app/accounting/certificates/page.module.css';
import { useToast } from '../../components/ui/ToastContext';
import { CertificateTypeDefinition, CertificateType } from '../../types/cash-register';
import { Button, Input, Modal } from '../ui';

export function CertificateTypeManager() {
    const toast = useToast();
    const [types, setTypes] = useState<CertificateTypeDefinition[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<CertificateTypeDefinition>>({
        name: '',
        baseLogic: 'amount',
        description: '',
        color: '#3182ce',
        settings: {
            canBeMixed: true,
            requireClient: true,
            transferable: false,
            allowTopUp: false
        },
        status: 'active'
    });

    useEffect(() => {
        fetchTypes();
    }, []);

    const fetchTypes = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/certificates/types');
            const data = await res.json();
            if (data.success) setTypes(data.data);
        } catch (e) {
            toast.error("Помилка завантаження типів");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/certificates/types', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Тип сертифіката створено");
                setIsModalOpen(false);
                fetchTypes();
            } else {
                toast.error(data.error);
            }
        } catch (e) {
            toast.error("Помилка створення");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Видалити цей тип? Це може вплинути на існуючі шаблони.")) return;
        try {
            const res = await fetch(`/api/certificates/types/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success("Видалено");
                fetchTypes();
            }
        } catch (e) {
            toast.error("Помилка");
        }
    };

    return (
        <>
            <div className={styles.header}>
                <h2>💎 Види сертифікатів (Сутності)</h2>
                <Button onClick={() => setIsModalOpen(true)}>+ Новий вид</Button>
            </div>

            <div className={styles.tableCard}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Назва</th>
                            <th>Базова логіка</th>
                            <th>Налаштування</th>
                            <th>Статус</th>
                            <th>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>Завантаження...</td></tr>
                        ) : types.length === 0 ? (
                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>Види відсутні</td></tr>
                        ) : types.map(t => (
                            <tr key={t.id}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: t.color }}></div>
                                        <strong>{t.name}</strong>
                                    </div>
                                    <small style={{ color: '#666' }}>{t.description}</small>
                                </td>
                                <td>
                                    {t.baseLogic === 'amount' && '💰 Сума'}
                                    {t.baseLogic === 'visits' && '🕒 Відвідування'}
                                    {t.baseLogic === 'service' && '🛠️ Послуга'}
                                </td>
                                <td>
                                    <div style={{ fontSize: '0.8rem', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                        {t.settings.canBeMixed && <span style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>Змішана оплата</span>}
                                        {t.settings.requireClient && <span style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>Прив'язка клієнта</span>}
                                        {t.settings.allowTopUp && <span style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>Поповнення</span>}
                                    </div>
                                </td>
                                <td>{t.status === 'active' ? '✅' : '❌'}</td>
                                <td>
                                    <button onClick={() => handleDelete(t.id!)} className={styles.btnIconDelete}>🗑️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Створення виду сертифіката">
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label>Назва (для адміна та клієнта)</label>
                        <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Наприклад: Подарункова карта, Абонемент" />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Базова логіка розрахунку</label>
                        <select className={styles.select} value={formData.baseLogic} onChange={e => setFormData({...formData, baseLogic: e.target.value as CertificateType})}>
                            <option value="amount">💰 Грошовий баланс</option>
                            <option value="visits">🕒 Кількість візитів</option>
                            <option value="service">🛠️ Конкретна послуга</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label>Опис</label>
                        <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Короткий опис для чого цей вид" />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Колір (для UI)</label>
                        <input type="color" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} style={{ width: '100%', height: '40px', padding: '5px', borderRadius: '6px' }} />
                    </div>
                    
                    <div className={styles.settingsSection}>
                        <h4>Параметри:</h4>
                        <label className={styles.categoryItem} style={{ marginBottom: '8px', border: 'none', padding: '0' }}>
                            <input type="checkbox" checked={formData.settings?.canBeMixed} onChange={e => setFormData({...formData, settings: {...formData.settings!, canBeMixed: e.target.checked}})} />
                            Дозволити змішану оплату
                        </label>
                        <label className={styles.categoryItem} style={{ marginBottom: '8px', border: 'none', padding: '0' }}>
                            <input type="checkbox" checked={formData.settings?.requireClient} onChange={e => setFormData({...formData, settings: {...formData.settings!, requireClient: e.target.checked}})} />
                            Обов'язкова прив'язка до клієнта
                        </label>
                        <label className={styles.categoryItem} style={{ marginBottom: '8px', border: 'none', padding: '0' }}>
                            <input type="checkbox" checked={formData.settings?.allowTopUp} onChange={e => setFormData({...formData, settings: {...formData.settings!, allowTopUp: e.target.checked}})} />
                            Можливість поповнення
                        </label>
                    </div>

                    <Button type="submit" style={{ marginTop: '20px' }}>Зберегти вид</Button>
                </form>
            </Modal>
        </>
    );
}
