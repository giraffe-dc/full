import React, { useState, useEffect } from 'react';
import { MenuProduct, ProductCategory } from '../../types/accounting';
import styles from './ProductFormModal.module.css';

interface ProductFormModalProps {
  isOpen: boolean;
  product?: MenuProduct;
  categories: ProductCategory[];
  onClose: () => void;
  onSave: (product: MenuProduct) => void;
}

export function ProductFormModal({
  isOpen,
  product,
  categories,
  onClose,
  onSave,
}: ProductFormModalProps) {
  const [formData, setFormData] = useState<Partial<MenuProduct>>({
    code: '',
    name: '',
    category: '',
    costPerUnit: 0,
    sellingPrice: 0,
    markup: 0,
    status: 'active',
  });

  const [showModifications, setShowModifications] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData(product);
    } else {
      setFormData({
        code: '',
        name: '',
        category: '',
        costPerUnit: 0,
        sellingPrice: 0,
        markup: 0,
        status: 'active',
      });
    }
  }, [product, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Загальний хендлер для полів, які не впливають на ціну/націнку
    if (name !== 'costPerUnit' && name !== 'sellingPrice' && name !== 'markup') {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
      return;
    }

    const numericValue = parseFloat(value);
    const safeValue = Number.isNaN(numericValue) ? 0 : numericValue;

    setFormData((prev) => {
      const costPerUnit = name === 'costPerUnit' ? safeValue : prev.costPerUnit ?? 0;
      let sellingPrice = name === 'sellingPrice' ? safeValue : prev.sellingPrice ?? 0;
      let markup = name === 'markup' ? safeValue : prev.markup ?? 0;

      // Якщо змінюємо ціну продажу – перерахувати націнку
      if (name === 'sellingPrice' && costPerUnit > 0) {
        markup = ((sellingPrice - costPerUnit) / costPerUnit) * 100;
      }

      // Якщо змінюємо націнку – перерахувати ціну продажу
      if (name === 'markup' && costPerUnit > 0) {
        sellingPrice = costPerUnit * (1 + markup / 100);
      }

      return {
        ...prev,
        costPerUnit,
        sellingPrice,
        markup,
      };
    });
  };

  const handleSave = () => {
    if (!formData.name || !formData.category) {
      alert('Заповніть обов\'язкові поля');
      return;
    }

    const newProduct: MenuProduct = {
      id: product?.id || `product-${Date.now()}`,
      code: formData.code || '',
      name: formData.name,
      category: formData.category,
      costPerUnit: formData.costPerUnit || 0,
      sellingPrice: formData.sellingPrice || 0,
      markup: formData.markup || 0,
      status: formData.status || 'active',
    };

    onSave(newProduct);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.title}>
              {product ? 'Редагування товару' : 'Додавання товару'}
            </h2>
          </div>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          <div className={styles.row}>
            <div className={styles.col}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Назва</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="Наприклад: Капучіно"
                  autoFocus
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Категорія</label>
                <select
                  name="category"
                  value={formData.category || ''}
                  onChange={handleInputChange}
                  className={styles.select}
                >
                  <option value="">Виберіть категорію</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.col}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Обкладинка</label>
                <div className={styles.imagePlaceholder}>БЧ</div>
              </div>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" />
              <span>Ваговий товар</span>
            </label>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="status" // Тимчасово, так як немає поля "isDiscountExcluded" в інтерфейсі
              />
              <span>Не бере участь в знижках</span>
            </label>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '24px 0' }} />

          <div className={styles.formGroup}>
            <label className={styles.label} style={{ marginBottom: 16 }}>Ціноутворення</label>

            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="priceType"
                  value="noModifications"
                  checked={!showModifications}
                  onChange={() => setShowModifications(false)}
                />
                <span>Один вид товару (без модифікацій)</span>
              </label>

              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="priceType"
                  value="withModifications"
                  checked={showModifications}
                  onChange={() => setShowModifications(true)}
                />
                <span>З модифікаціями (різні об'єми/види)</span>
              </label>
            </div>

            {!showModifications && (
              <div className={styles.priceInputs}>
                <div className={styles.priceField}>
                  <div style={{ width: '100%' }}>
                    <label className={styles.label} style={{ fontSize: 11, marginBottom: 4 }}>Собівартість</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="number"
                        name="costPerUnit"
                        value={formData.costPerUnit || 0}
                        onChange={handleInputChange}
                        className={styles.priceInput}
                        placeholder="0"
                      />
                      <span className={styles.currency}>₴</span>
                    </div>
                  </div>
                </div>

                <div className={styles.plusButton}>+</div>

                <div className={styles.priceField}>
                  <div style={{ width: '100%' }}>
                    <label className={styles.label} style={{ fontSize: 11, marginBottom: 4 }}>Націнка</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="number"
                        name="markup"
                        value={formData.markup ? Math.round(formData.markup) : 0}
                        onChange={handleInputChange}
                        className={styles.priceInput}
                        placeholder="0"
                      />
                      <span className={styles.currency}>%</span>
                    </div>
                  </div>
                </div>

                <span className={styles.equals}>=</span>

                <div className={styles.priceField}>
                  <div style={{ width: '100%' }}>
                    <label className={styles.label} style={{ fontSize: 11, marginBottom: 4, color: '#059669' }}>Ціна продажу</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="number"
                        name="sellingPrice"
                        value={formData.sellingPrice || 0}
                        onChange={handleInputChange}
                        className={styles.priceInput}
                        placeholder="0"
                        style={{ borderColor: '#10b981', color: '#047857', fontWeight: 700 }}
                      />
                      <span className={styles.currency}>₴</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showModifications && (
              <div className={styles.modificationsInfo}>
                <span style={{ fontSize: 24 }}>ℹ️</span>
                <div>
                  <p style={{ fontWeight: 600, marginBottom: 4 }}>Режим модифікацій</p>
                  <p style={{ fontWeight: 400 }}>Ви зможете додати різні варіанти цього товару (наприклад: 250мл, 400мл) після створення картки.</p>
                </div>
              </div>
            )}
          </div>
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
