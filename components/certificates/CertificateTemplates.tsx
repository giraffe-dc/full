"use client";

import { useState, useEffect } from 'react';
import styles from '../../app/accounting/certificates/page.module.css';
import { useToast } from '../../components/ui/ToastContext';
import { CertificateTemplate, CertificateType, CertificateTypeDefinition } from '../../types/cash-register';
import { Button, Input, Modal } from '../ui';

export function CertificateTemplates() {
    const toast = useToast();
    const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
    const [types, setTypes] = useState<CertificateTypeDefinition[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<CertificateTemplate>>({
        name: '',
        typeId: '',
        type: 'amount',
        amount: 0,
        pricePaid: 0,
        status: 'active'
    });

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/certificates/templates');
            const data = await res.json();
            if (data.success) setTemplates(data.data);

            const typeRes = await fetch('/api/certificates/types');
            const typeData = await typeRes.json();
            if (typeData.success) setTypes(typeData.data.filter((t: any) => t.status === 'active'));
        } catch (e) {
            toast.error("Помилка завантаження даних");
        } finally {
            setLoading(false);
        }
    };

    const handleTypeChange = (typeId: string) => {
        const selectedType = types.find(t => t.id === typeId);
        if (selectedType) {
            setFormData({
                ...formData,
                typeId,
                type: selectedType.baseLogic
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/certificates/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Шаблон створено");
                setIsModalOpen(false);
                fetchTemplates();
            } else {
                toast.error(data.error);
            }
        } catch (e) {
            toast.error("Помилка створення");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Видалити цей шаблон?")) return;
        try {
            const res = await fetch(`/api/certificates/templates/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success("Видалено");
                fetchTemplates();
            }
        } catch (e) {
            toast.error("Помилка");
        }
    };

    return (
        <>
            <div className={styles.header}>
                <h2>📋 Шаблони сертифікатів</h2>
                <Button onClick={() => setIsModalOpen(true)}>+ Створити шаблон</Button>
            </div>

            <div className={styles.tableCard}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Назва</th>
                            <th>Тип</th>
                            <th>Номінал / Послуга</th>
                            <th>Ціна продажу</th>
                            <th>Статус</th>
                            <th>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>Завантаження...</td></tr>
                        ) : templates.length === 0 ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>Шаблони відсутні</td></tr>
                        ) : templates.map(t => (
                            <tr key={t.id}>
                                <td><strong>{t.name}</strong></td>
                                <td>{t.type}</td>
                                <td>
                                    {t.type === 'amount' && `${t.amount} ₴`}
                                    {t.type === 'visits' && `${t.visitsTotal} відвідувань`}
                                    {t.type === 'service' && t.serviceName}
                                </td>
                                <td>{t.pricePaid} ₴</td>
                                <td>{t.status}</td>
                                <td>
                                    <button onClick={() => handleDelete(t.id!)} className={styles.btnIconDelete}>🗑️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Створення шаблону">
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label>Назва шаблону</label>
                        <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Наприклад: VIP Подарунок 1000" />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Вид сертифіката (Сутність)</label>
                        <select className={styles.select} value={formData.typeId} onChange={e => handleTypeChange(e.target.value)} required>
                            <option value="">-- Оберіть вид --</option>
                            {types.map(t => (
                                <option key={t.id} value={t.id}>{t.name} ({t.baseLogic})</option>
                            ))}
                        </select>
                        <small style={{ color: '#666' }}>Налаштуйте види у вкладці "Вида"</small>
                    </div>
                    {formData.type === 'amount' && (
                        <div className={styles.formGroup}>
                            <label>Номінал (₴)</label>
                            <Input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} required />
                        </div>
                    )}
                    {formData.type === 'visits' && (
                        <div className={styles.formGroup}>
                            <label>Кількість відвідувань</label>
                            <Input type="number" value={formData.visitsTotal} onChange={e => setFormData({...formData, visitsTotal: Number(e.target.value)})} required />
                        </div>
                    )}
                    <div className={styles.formGroup}>
                        <label>Ціна продажу (₴)</label>
                        <Input type="number" value={formData.pricePaid} onChange={e => setFormData({...formData, pricePaid: Number(e.target.value)})} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Термін дії (днів)</label>
                        <Input type="number" value={formData.expirationDays} onChange={e => setFormData({...formData, expirationDays: Number(e.target.value)})} placeholder="Без ліміту" />
                    </div>
                    <Button type="submit">Зберегти</Button>
                </form>
            </Modal>
        </>
    );
}
