"use client";

import React, { useState, useEffect } from 'react';
import { ExpenseCategory } from '../../types/accounting';
import styles from './ClientsSection.module.css'; // Reusing common styles
import { useToast } from '../ui/ToastContext';
import { Modal } from '../ui/Modal';

interface ExpenseCategoriesSectionProps {
    onRefresh?: () => void;
}

export function ExpenseCategoriesSection({ onRefresh }: ExpenseCategoriesSectionProps) {
    const toast = useToast();
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        color: '#3182ce',
        status: 'active'
    });

    useEffect(() => {
        fetchCategories();
    }, []);

    async function fetchCategories() {
        setLoading(true);
        try {
            const res = await fetch('/api/accounting/categories/expense');
            const data = await res.json();
            if (data.data) {
                setCategories(data.data);
            }
        } catch (e) {
            console.error(e);
            toast.error('Помилка завантаження категорій');
        } finally {
            setLoading(false);
        }
    }

    const handleOpenAdd = () => {
        setEditingCategory(null);
        setFormData({
            name: '',
            description: '',
            color: '#3182ce',
            status: 'active'
        });
        setShowForm(true);
    };

    const handleOpenEdit = (cat: ExpenseCategory) => {
        setEditingCategory(cat);
        setFormData({
            name: cat.name,
            description: cat.description || '',
            color: cat.color || '#3182ce',
            status: cat.status || 'active'
        });
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = '/api/accounting/categories/expense';
            const method = editingCategory ? 'PUT' : 'POST';
            const body = editingCategory ? { ...formData, id: editingCategory.id } : formData;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                toast.success(editingCategory ? 'Категорію оновлено' : 'Категорію створено');
                setShowForm(false);
                fetchCategories();
                if (onRefresh) onRefresh();
            } else {
                toast.error('Помилка збереження');
            }
        } catch (e) {
            console.error(e);
            toast.error('Помилка сервера');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Видалити цю категорію?')) return;
        try {
            const res = await fetch(`/api/accounting/categories/expense?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Категорію видалено');
                fetchCategories();
                if (onRefresh) onRefresh();
            } else {
                toast.error('Помилка видалення');
            }
        } catch (e) {
            console.error(e);
            toast.error('Помилка сервера');
        }
    };

    const filteredCategories = categories.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.titleBlock}>
                    <h2 className={styles.title}>Категорії витрат</h2>
                    <span className={styles.countBadge}>{categories.length} категорій</span>
                </div>
                <div className={styles.headerActions}>
                    <button 
                        className={styles.toolbarButton} 
                        style={{ backgroundColor: '#3182ce', color: 'white' }}
                        onClick={handleOpenAdd}
                    >
                        ➕ Додати категорію
                    </button>
                </div>
            </div>

            <div className={styles.controls}>
                <div className={styles.searchContainer}>
                    <span className={styles.searchIcon}>🔍</span>
                    <input
                        className={styles.searchInput}
                        placeholder="Пошук категорій..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles.tableCard}>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}></th>
                                <th>Назва</th>
                                <th>Опис</th>
                                <th>Статус</th>
                                <th style={{ textAlign: 'right' }}>Дії</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>Завантаження...</td></tr>
                            ) : filteredCategories.length === 0 ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>Категорій не знайдено</td></tr>
                            ) : (
                                filteredCategories.map((cat) => (
                                    <tr key={cat.id}>
                                        <td>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: cat.color }}></div>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{cat.name}</td>
                                        <td style={{ color: '#666' }}>{cat.description || '—'}</td>
                                        <td>
                                            <span style={{ 
                                                fontSize: '0.75rem', 
                                                padding: '2px 8px', 
                                                borderRadius: '12px',
                                                backgroundColor: cat.status === 'active' ? '#e6fffa' : '#f7fafc',
                                                color: cat.status === 'active' ? '#319795' : '#718096'
                                            }}>
                                                {cat.status === 'active' ? 'Активна' : 'Неактивна'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button onClick={() => handleOpenEdit(cat)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '12px' }}>✏️</button>
                                            <button onClick={() => handleDelete(cat.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                title={editingCategory ? 'Редагувати категорію' : 'Нова категорія'}
            >
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', fontWeight: 500 }}>Назва *</label>
                        <input
                            required
                            className={styles.searchInput}
                            style={{ width: '100%' }}
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Наприклад: Оренда, Закупівля..."
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', fontWeight: 500 }}>Опис</label>
                        <textarea
                            className={styles.searchInput}
                            style={{ width: '100%', minHeight: '80px', padding: '8px' }}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Додаткова інформація"
                        />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', fontWeight: 500 }}>Колір</label>
                            <input
                                type="color"
                                style={{ width: '100%', height: '38px', padding: '2px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                                value={formData.color}
                                onChange={e => setFormData({ ...formData, color: e.target.value })}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', fontWeight: 500 }}>Статус</label>
                            <select
                                className={styles.searchInput}
                                style={{ width: '100%', height: '38px' }}
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="active">Активна</option>
                                <option value="inactive">Неактивна</option>
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                        <button type="button" onClick={() => setShowForm(false)} className={styles.toolbarButton}>Скасувати</button>
                        <button type="submit" className={styles.toolbarButton} style={{ backgroundColor: '#3182ce', color: 'white' }}>Зберегти</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
