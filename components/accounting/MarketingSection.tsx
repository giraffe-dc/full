import React, { useState, useEffect } from 'react';
import styles from './MarketingSection.module.css'; // Make sure to create this or use shared styles
import { PromotionModal } from './marketing/PromotionModal';
import { Promotion } from '../../types/marketing';
import { useToast } from '../ui/ToastContext';

interface MarketingSectionProps {
    // Props if needed
}

export function MarketingSection({ }: MarketingSectionProps) {
    const toast = useToast();
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState<Promotion | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchPromotions();
    }, []);

    const fetchPromotions = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/marketing/promotions');
            const data = await res.json();
            if (data.success) {
                setPromotions(data.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingPromotion(undefined);
        setShowModal(true);
    };

    const handleEdit = (p: Promotion) => {
        setEditingPromotion(p);
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Ви впевнені, що хочете видалити цю акцію?")) return;
        try {
            const res = await fetch(`/api/marketing/promotions/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success("Акцію видалено");
                fetchPromotions();
            }
        } catch (e) {
            toast.error("Помилка видалення");
        }
    };

    const handleSave = async (p: Promotion) => {
        try {
            const method = p.id || p._id ? 'PUT' : 'POST';
            const url = p.id || p._id
                ? `/api/marketing/promotions/${p.id || p._id}`
                : '/api/marketing/promotions';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(p)
            });

            if (res.ok) {
                toast.success("Дані збережено");
                setShowModal(false);
                fetchPromotions();
            } else {
                toast.error("Помилка збереження");
            }
        } catch (e) {
            toast.error("Помилка мережі");
        }
    };

    return (
        <div style={{ padding: '0 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    {/* Tabs usually go here */}
                </div>
                <button
                    onClick={handleCreate}
                    style={{
                        background: '#3b82f6', color: 'white', border: 'none', padding: '0.6rem 1.2rem',
                        borderRadius: '6px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                    }}
                >
                    + Створити акцію
                </button>
            </div>

            <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        <tr>
                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>Назва</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>Період дії</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>Умови</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>Результат</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>Статус</th>
                            <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        {promotions.map(p => (
                            <tr key={p.id || p._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '1rem', fontWeight: 500, color: '#111827' }}>{p.name}</td>
                                <td style={{ padding: '1rem', color: '#4b5563', fontSize: '0.9rem' }}>
                                    {p.startDate} — {p.endDate}
                                </td>
                                <td style={{ padding: '1rem', color: '#4b5563', fontSize: '0.9rem' }}>
                                    {p.conditions.length} умов
                                </td>
                                <td style={{ padding: '1rem', color: '#4b5563', fontSize: '0.9rem' }}>
                                    {p.result?.type === 'percent_discount' ? `-${p.result.value}%` : `-${p.result.value} ₴`}
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 600,
                                        background: p.isActive ? '#ecfdf5' : '#f3f4f6', color: p.isActive ? '#059669' : '#6b7280'
                                    }}>
                                        {p.isActive ? 'Активна' : 'Неактивна'}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                    <button
                                        onClick={() => handleEdit(p)}
                                        style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', marginRight: '10px' }}
                                    >
                                        ✎
                                    </button>
                                    <button
                                        onClick={() => handleDelete(p.id || p._id!)}
                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                    >
                                        🗑
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {promotions.length === 0 && (
                            <tr>
                                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
                                    У вас поки немає створених акцій
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <PromotionModal
                    promotion={editingPromotion}
                    onClose={() => setShowModal(false)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}
