"use client";

import { useState, useEffect } from 'react';
import styles from '../../app/accounting/certificates/page.module.css';
import { useToast } from '../../components/ui/ToastContext';
import { Button } from '../ui';

export function CertificateSettings() {
    const toast = useToast();
    const [categories, setCategories] = useState<any[]>([]);
    const [allowedCategories, setAllowedCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch categories
            const catRes = await fetch('/api/accounting/categories');
            const catData = await catRes.json();
            if (catData.success) setCategories(catData.data);

            // Fetch current settings
            const setRes = await fetch('/api/certificates/settings');
            const setData = await setRes.json();
            if (setData.success) setAllowedCategories(setData.data.allowedCategories || []);
        } catch (e) {
            toast.error("Помилка завантаження даних");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleCategory = (id: string) => {
        setAllowedCategories(prev => 
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    const handleSave = async () => {
        try {
            const res = await fetch('/api/certificates/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ allowedCategories })
            });
            if (res.ok) toast.success("Налаштування збережено");
        } catch (e) {
            toast.error("Помилка збереження");
        }
    };

    return (
        <div className={styles.tableCard} style={{ padding: '20px' }}>
            <h2>⚙️ Глобальні налаштування</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>Виберіть категорії товарів та послуг, на які дозволено списання сертифікатами за замовчуванням.</p>
            
            <div className={styles.categoryGrid}>
                {categories.map(cat => (
                    <label key={cat._id} className={styles.categoryItem}>
                        <input 
                            type="checkbox" 
                            checked={allowedCategories.includes(cat._id)}
                            onChange={() => handleToggleCategory(cat._id)}
                        />
                        {cat.name}
                    </label>
                ))}
            </div>

            <div style={{ marginTop: '30px' }}>
                <Button onClick={handleSave}>Зберегти налаштування</Button>
            </div>
        </div>
    );
}
