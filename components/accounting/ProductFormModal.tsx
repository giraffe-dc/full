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
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={onClose}>
            ‹
          </button>
          <h2 className={styles.title}>
            {product ? 'Редагування товару' : 'Додавання товару'}
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
              placeholder="Введіть назву товару"
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

          <div className={styles.formGroup}>
            <label className={styles.label}>Ціна приготування</label>
            <input
              type="number"
              name="costPerUnit"
              value={formData.costPerUnit || ''}
              onChange={handleInputChange}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Обкладинка</label>
            <div className={styles.imagePlaceholder}></div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" />
              <span>Ватовий товар</span>
            </label>
            <a href="#" className={styles.helpLink}>
              Що таке ватовий товар?
            </a>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" />
              <span>Не бере участь в знижках</span>
            </label>
            <a href="#" className={styles.helpLink}>
              Копи товар не бере участі у знижках?
            </a>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Ціна за штрихкод</label>

            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="priceType"
                  value="noModifications"
                  checked={!showModifications}
                  onChange={() => setShowModifications(false)}
                />
                <span>Без модифікацій</span>
                <span className={styles.hint}>(Один вид товару)</span>
              </label>
            </div>

            {!showModifications && (
              <div className={styles.priceInputs}>
                <div className={styles.priceField}>
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

                <button className={styles.plusButton} type="button">
                  +
                </button>

                <div className={styles.priceField}>
                  <input
                    type="number"
                    name="markup"
                    value={formData.markup || 0}
                    onChange={handleInputChange}
                    className={styles.priceInput}
                    placeholder="0"
                  />
                  <span className={styles.currency}>%</span>
                </div>

                <span className={styles.equals}>=</span>

                <div className={styles.priceField}>
                  <input
                    type="number"
                    name="sellingPrice"
                    value={formData.sellingPrice || 0}
                    onChange={handleInputChange}
                    className={styles.priceInput}
                    placeholder="0"
                  />
                  <span className={styles.currency}>₴</span>
                </div>
              </div>
            )}

            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="priceType"
                  value="withModifications"
                  checked={showModifications}
                  onChange={() => setShowModifications(true)}
                />
                <span>З модифікаціями</span>
                <span className={styles.hint}>(Декілька видів товару)</span>
              </label>
            </div>

            {showModifications && (
              <div className={styles.modificationsInfo}>
                <p>Модифікації можна додати після створення товару</p>
              </div>
            )}
          </div>

          {/* <div className={styles.helpLinks}>
            <a href="#" className={styles.helpLink}>
              Що таке ватовий товар?
            </a>
            <a href="#" className={styles.helpLink}>
              Копи товар не бере участі у знижках?
            </a>
            <a href="#" className={styles.helpLink}>
              Як змінити собівартість?
            </a>
            <a href="#" className={styles.helpLink}>
              Як додати штрихкод товару?
            </a>
            <a href="#" className={styles.helpLink}>
              Що таке модифікації?
            </a>
          </div> */}
        </div>

        <div className={styles.footer}>
          <button className={styles.saveButton} onClick={handleSave}>
            Зберегти
          </button>
          <button className={styles.saveContinueButton} onClick={handleSave}>
            Зберегти та створити ще
          </button>
        </div>
      </div>
    </div>
  );
}
