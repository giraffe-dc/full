
import React, { useState, useEffect } from 'react';
import styles from './StockSection.module.css';

interface Supplier {
    _id: string;
    name: string;
    contactName: string;
    phone: string;
    email: string;
    address: string;
}

export function StockSuppliers() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', contactName: '', phone: '', email: '', address: '' });
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        try {
            const res = await fetch('/api/accounting/stock/suppliers');
            const data = await res.json();
            if (data.data) {
                setSuppliers(data.data);
            }
        } catch (error) {
            console.error('Error fetching suppliers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = '/api/accounting/stock/suppliers';
            const method = editingId ? 'PUT' : 'POST';
            const body = editingId ? { ...formData, _id: editingId } : formData;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                setIsModalOpen(false);
                setFormData({ name: '', contactName: '', phone: '', email: '', address: '' });
                setEditingId(null);
                fetchSuppliers();
            }
        } catch (error) {
            console.error('Error saving supplier:', error);
        }
    };

    const handleEdit = (sup: Supplier) => {
        setFormData({
            name: sup.name,
            contactName: sup.contactName,
            phone: sup.phone,
            email: sup.email,
            address: sup.address
        });
        setEditingId(sup._id);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Видалити постачальника?')) return;
        try {
            await fetch(`/api/accounting/stock/suppliers?id=${id}`, { method: 'DELETE' });
            fetchSuppliers();
        } catch (error) {
            console.error('Error deleting supplier:', error);
        }
    };

    return (
        <section className={styles.card}>
            <div className={styles.headerRow}>
                <div className={styles.titleBlock}>
                    <h2 className={styles.title}>Постачальники</h2>
                </div>
                <div className={styles.toolbarRight}>
                    <button
                        className={`${styles.toolbarButton} ${styles.buttonPrimary}`}
                        onClick={() => {
                            setEditingId(null);
                            setFormData({ name: '', contactName: '', phone: '', email: '', address: '' });
                            setIsModalOpen(true);
                        }}
                    >
                        ➕ Додати постачальника
                    </button>
                </div>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Назва</th>
                            <th>Контактна особа</th>
                            <th>Телефон</th>
                            <th>Email</th>
                            <th>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        {suppliers.length > 0 ? (
                            suppliers.map((sup) => (
                                <tr key={sup._id}>
                                    <td>{sup.name}</td>
                                    <td>{sup.contactName}</td>
                                    <td>{sup.phone}</td>
                                    <td>{sup.email}</td>
                                    <td>
                                        <button onClick={() => handleEdit(sup)} className={styles.actionButton}>✏️</button>
                                        <button onClick={() => handleDelete(sup._id)} className={styles.actionButton}>🗑️</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className={styles.noData}>Постачальників не знайдено</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <h3>{editingId ? 'Редагувати постачальника' : 'Додати постачальника'}</h3>
                        <form onSubmit={handleSubmit} className={styles.formGrid}>
                            <div className={styles.formGroup}>
                                <label>Назва компанії</label>
                                <input
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className={styles.input}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Контактна особа</label>
                                <input
                                    value={formData.contactName}
                                    onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                                    className={styles.input}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Телефон</label>
                                <input
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className={styles.input}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Email</label>
                                <input
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className={styles.input}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Адреса</label>
                                <input
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    className={styles.input}
                                />
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" onClick={() => setIsModalOpen(false)} className={styles.buttonSecondary}>Скасувати</button>
                                <button type="submit" className={styles.buttonPrimary}>Зберегти</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}
