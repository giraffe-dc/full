import React, { useState, useEffect } from 'react';
import styles from './Modal.module.css';
import { useToast } from '../ui/ToastContext';

interface TrashModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'products' | 'recipes' | 'ingredients';
    onRestore: (id: string, type: 'product' | 'recipe' | 'ingredient') => void;
    title: string;
}

export function TrashModal({ isOpen, onClose, type, onRestore, title }: TrashModalProps) {
    const toast = useToast();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadInactiveItems();
        }
    }, [isOpen, type]);

    const loadInactiveItems = async () => {
        setLoading(true);
        try {
            let endpoint = '';
            if (type === 'products') endpoint = '/api/accounting/products';
            else if (type === 'recipes') endpoint = '/api/accounting/recipes';
            else if (type === 'ingredients') endpoint = '/api/accounting/ingredients';

            const response = await fetch(`${endpoint}?status=inactive`);
            const data = await response.json();
            if (data.success) {
                setItems(data.data);
            }
        } catch (error) {
            console.error('Error loading trash items:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (id: string) => {
        try {
            // We need an endpoint or logic to restore. 
            // Currently simple update will work if we reuse updateProduct/Recipe function but we essentially need to set status to 'active'
            // reusing onRestore callback to let parent handle the logic or we can do it here.
            // Let's do it here for simplicity specific to the type

            let endpoint = '';
            let restoreType: 'product' | 'recipe' | 'ingredient' = 'product';

            if (type === 'products') {
                endpoint = `/api/accounting/products/${id}`;
                restoreType = 'product';
            } else if (type === 'recipes') {
                endpoint = `/api/accounting/recipes/${id}`;
                restoreType = 'recipe';
            } else if (type === 'ingredients') {
                endpoint = `/api/accounting/ingredients/${id}`;
                restoreType = 'ingredient';
            }

            // Strategy: Find the item in our 'items' state, and send it back with status: 'active'
            const item = items.find(i => i.id === id);
            if (!item) return;

            const response = await fetch(endpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...item, status: 'active' })
            });

            const res = await response.json();

            if (res.success) {
                toast.success('Елемент відновлено');
                // Remove from local list
                setItems(items.filter(i => i.id !== id));
                // Notify parent to refresh main list
                onRestore(id, restoreType);
            } else {
                toast.error('Помилка відновлення: ' + res.error);
            }

        } catch (error) {
            console.error('Error restoring item:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent} style={{ maxWidth: '800px', width: '90%' }}>
                <div className={styles.modalHeader}>
                    <h3 className={styles.modalTitle}>🗑️ Кошик: {title}</h3>
                    <button className={styles.closeButton} onClick={onClose}>×</button>
                </div>

                <div className={styles.modalBody}>
                    {loading ? (
                        <p>Завантаження...</p>
                    ) : items.length === 0 ? (
                        <p>Кошик порожній</p>
                    ) : (
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Назва</th>
                                        <th>Категорія</th>
                                        <th style={{ textAlign: 'right' }}>Дії</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map(item => (
                                        <tr key={item.id}>
                                            <td>{item.name} <small style={{ color: '#888' }}>({item.code})</small></td>
                                            <td>{item.category}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button
                                                    onClick={() => handleRestore(item.id)}
                                                    className={styles.restoreButton}
                                                >
                                                    Відновити
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className={styles.modalFooter}>
                    <button className={styles.buttonSecondary} onClick={onClose}>
                        Закрити
                    </button>
                </div>
            </div>
        </div>
    );
}
