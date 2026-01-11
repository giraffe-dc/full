import React, { useState, useEffect } from 'react';
import { MenuIngredient } from '../../types/accounting';
import styles from './IngredientFormModal.module.css';
import { useToast } from '../ui/ToastContext';

interface IngredientFormModalProps {
    isOpen: boolean;
    ingredient?: MenuIngredient;
    categories: string[];
    onClose: () => void;
    onSave: (ingredient: MenuIngredient) => void;
}

export function IngredientFormModal({
    isOpen,
    ingredient,
    categories,
    onClose,
    onSave,
}: IngredientFormModalProps) {
    const toast = useToast();
    const [formData, setFormData] = useState<Partial<MenuIngredient>>({
        code: '',
        name: '',
        category: '',
        unit: 'кг',
        costPerUnit: 0,
        status: 'active',
    });

    useEffect(() => {
        if (ingredient) {
            setFormData(ingredient);
        } else {
            setFormData({
                code: '',
                name: '',
                category: '',
                unit: 'кг',
                costPerUnit: 0,
                status: 'active',
            });
        }
    }, [ingredient, isOpen]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === 'costPerUnit') {
            setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
            return;
        }

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSave = () => {
        if (!formData.name || !formData.category) {
            toast.error('Заповніть обов\'язкові поля');
            return;
        }

        const newIngredient: MenuIngredient = {
            id: ingredient?.id || `ingredient-${Date.now()}`,
            code: formData.code || '',
            name: formData.name,
            category: formData.category,
            unit: formData.unit || 'кг',
            costPerUnit: formData.costPerUnit || 0,
            status: formData.status || 'active',
        };

        onSave(newIngredient);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h2 className={styles.title}>
                            {ingredient ? 'Редагування інгредієнта' : 'Додавання інгредієнта'}
                        </h2>
                    </div>
                    <button className={styles.closeButton} onClick={onClose}>×</button>
                </div>

                <div className={styles.content}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Назва</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name || ''}
                            onChange={handleInputChange}
                            className={styles.input}
                            placeholder="Наприклад: Молоко"
                            autoFocus
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Категорія</label>
                        <input
                            list="category-list"
                            name="category"
                            value={formData.category || ''}
                            onChange={handleInputChange}
                            className={styles.input}
                            placeholder="Виберіть або введіть категорію"
                        />
                        <datalist id="category-list">
                            {categories.map((cat) => (
                                <option key={cat} value={cat} />
                            ))}
                        </datalist>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Одиниця виміру</label>
                        <select
                            name="unit"
                            value={formData.unit || 'кг'}
                            onChange={handleInputChange}
                            className={styles.select}
                        >
                            <option value="кг">кг</option>
                            <option value="л">л</option>
                            <option value="шт">шт</option>
                            <option value="г">г</option>
                            <option value="мл">мл</option>
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Ціна за одиницю ({formData.unit})</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input
                                type="number"
                                name="costPerUnit"
                                value={formData.costPerUnit || ''}
                                onChange={handleInputChange}
                                className={styles.input}
                                placeholder="0"
                            />
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#6b7280' }}>₴</span>
                        </div>
                    </div>

                    {/* Code field if needed, currently hidden or auto-generated, but model has it */}
                    {/* <div className={styles.formGroup}>
            <label className={styles.label}>Код</label>
            <input
              type="number"
              name="code"
              value={formData.code || ''}
              onChange={handleInputChange}
              className={styles.input}
            />
          </div> */}

                </div>

                <div className={styles.footer}>
                    <button className={styles.saveButton} onClick={handleSave}>
                        Зберегти
                    </button>
                    <button className={styles.saveContinueButton} onClick={handleSave}>
                        Зберегти та додати ще
                    </button>
                </div>
            </div>
        </div>
    );
}
