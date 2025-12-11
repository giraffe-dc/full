import React, { useState, useEffect } from 'react';
import { ProductCategory } from '../../types/accounting';
import styles from './CategoryFormModal.module.css';

interface CategoryFormModalProps {
  isOpen: boolean;
  category?: ProductCategory;
  parentCategories: ProductCategory[];
  onClose: () => void;
  onSave: (category: ProductCategory) => void;
}

export function CategoryFormModal({
  isOpen,
  category,
  parentCategories,
  onClose,
  onSave,
}: CategoryFormModalProps) {
  const [formData, setFormData] = useState<Partial<ProductCategory>>({
    name: '',
    parentCategory: undefined,
    description: '',
    status: 'active',
  });

  useEffect(() => {
    if (category) {
      setFormData(category);
    } else {
      setFormData({
        name: '',
        parentCategory: undefined,
        description: '',
        status: 'active',
      });
    }
  }, [category, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = () => {
    if (!formData.name) {
      alert('Введіть назву категорії');
      return;
    }

    const newCategory: ProductCategory = {
      id: category?.id || `category-${Date.now()}`,
      name: formData.name,
      parentCategory: formData.parentCategory || undefined,
      description: formData.description || '',
      status: (formData.status as 'active' | 'inactive') || 'active',
      createdAt: category?.createdAt || new Date().toISOString(),
    };

    onSave(newCategory);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={onClose}>
            ‹
          </button>
          <h2 className={styles.title}>
            {category ? 'Редагування категорії товарів та тех. карток' : 'Додавання категорії товарів та тех. карток'}
          </h2>
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
              placeholder="Напрклад, «Холодні напої» або «Салати»"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Категорія</label>
            <select
              name="parentCategory"
              value={formData.parentCategory || ''}
              onChange={handleInputChange}
              className={styles.select}
            >
              <option value="">Головний екран</option>
              {parentCategories
                .filter((cat) => cat.id !== category?.id)
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Обкладинка</label>
            <div className={styles.imagePlaceholder}></div>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.saveButton} onClick={handleSave}>
            Зберегти
          </button>
        </div>
      </div>
    </div>
  );
}
