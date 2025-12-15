
import React, { useState, useEffect } from 'react';
import styles from './StockSection.module.css';

interface Warehouse {
    _id: string;
    name: string;
    address: string;
    description: string;
    status: 'active' | 'inactive';
}

export function StockWarehouses() {
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', address: '', description: '' });
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        fetchWarehouses();
    }, []);

    const fetchWarehouses = async () => {
        try {
            const res = await fetch('/api/accounting/stock/warehouses');
            const data = await res.json();
            if (data.data) {
                setWarehouses(data.data);
            }
        } catch (error) {
            console.error('Error fetching warehouses:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = '/api/accounting/stock/warehouses';
            const method = editingId ? 'PUT' : 'POST';
            const body = editingId ? { ...formData, _id: editingId } : formData;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                setIsModalOpen(false);
                setFormData({ name: '', address: '', description: '' });
                setEditingId(null);
                fetchWarehouses();
            }
        } catch (error) {
            console.error('Error saving warehouse:', error);
        }
    };

    const handleEdit = (wh: Warehouse) => {
        setFormData({ name: wh.name, address: wh.address, description: wh.description });
        setEditingId(wh._id);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Видалити склад?')) return;
        try {
            await fetch(`/api/accounting/stock/warehouses?id=${id}`, { method: 'DELETE' });
            fetchWarehouses();
        } catch (error) {
            console.error('Error deleting warehouse:', error);
        }
    };

    return (
        <section className={styles.card}>
            <div className={styles.headerRow}>
                <div className={styles.titleBlock}>
                    <h2 className={styles.title}>Склади</h2>
                </div>
                <div className={styles.toolbarRight}>
                    <button
                        className={`${styles.toolbarButton} ${styles.buttonPrimary}`}
                        onClick={() => {
                            setEditingId(null);
                            setFormData({ name: '', address: '', description: '' });
                            setIsModalOpen(true);
                        }}
                    >
                        ➕ Додати склад
                    </button>
                </div>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Назва</th>
                            <th>Адреса</th>
                            <th>Опис</th>
                            <th>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        {warehouses.length > 0 ? (
                            warehouses.map((wh) => (
                                <tr key={wh._id}>
                                    <td>{wh.name}</td>
                                    <td>{wh.address}</td>
                                    <td>{wh.description}</td>
                                    <td>
                                        <button onClick={() => handleEdit(wh)} className={styles.actionButton}>✏️</button>
                                        <button onClick={() => handleDelete(wh._id)} className={styles.actionButton}>🗑️</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className={styles.noData}>Складів не знайдено</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <h3>{editingId ? 'Редагувати склад' : 'Додати склад'}</h3>
                        <form onSubmit={handleSubmit} className={styles.formGrid}>
                            <div className={styles.formGroup}>
                                <label>Назва</label>
                                <input
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
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
                            <div className={styles.formGroup}>
                                <label>Опис</label>
                                <input
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
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
