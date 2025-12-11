import React, { useState, useEffect } from 'react';
import { MenuRecipe, RecipeIngredient } from '../../types/accounting';
import styles from './RecipeFormModal.module.css';

interface RecipeFormModalProps {
  isOpen: boolean;
  recipe?: MenuRecipe;
  categories: string[];
  ingredients: string[];
  onClose: () => void;
  onSave: (recipe: MenuRecipe) => void;
}

export function RecipeFormModal({
  isOpen,
  recipe,
  categories,
  ingredients,
  onClose,
  onSave,
}: RecipeFormModalProps) {
  const [formData, setFormData] = useState<Partial<MenuRecipe>>({
    code: '',
    name: '',
    category: '',
    yield: 0,
    yieldUnit: 'г',
    costPerUnit: 0,
    sellingPrice: 0,
    markup: 0,
    ingredients: [],
    notes: '',
    status: 'active',
  });

  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [ingredientQuantity, setIngredientQuantity] = useState('');
  const [ingredientUnit, setIngredientUnit] = useState('');

  useEffect(() => {
    if (recipe) {
      setFormData(recipe);
      setRecipeIngredients(recipe.ingredients || []);
    } else {
      setFormData({
        code: '',
        name: '',
        category: '',
        yield: 0,
        yieldUnit: 'г',
        costPerUnit: 0,
        sellingPrice: 0,
        markup: 0,
        ingredients: [],
        notes: '',
        status: 'active',
      });
      setRecipeIngredients([]);
    }
  }, [recipe, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'yield' || name === 'costPerUnit' || name === 'sellingPrice' || name === 'markup'
        ? parseFloat(value) || 0
        : value,
    }));
  };

  const handleAddIngredient = () => {
    if (!selectedIngredient || !ingredientQuantity) {
      alert('Виберіть інгредієнт та введіть кількість');
      return;
    }

    const newIngredient: RecipeIngredient = {
      id: `ingredient-${Date.now()}`,
      name: selectedIngredient,
      quantity: parseFloat(ingredientQuantity),
      unit: ingredientUnit || 'шт',
      costPerUnit: 0,
      totalCost: 0,
    };

    setRecipeIngredients([...recipeIngredients, newIngredient]);
    setSelectedIngredient('');
    setIngredientQuantity('');
    setIngredientUnit('');
  };

  const handleRemoveIngredient = (id: string) => {
    setRecipeIngredients(recipeIngredients.filter((ing) => ing.id !== id));
  };

  const handleSave = () => {
    if (!formData.name || !formData.category) {
      alert('Заповніть обов\'язкові поля');
      return;
    }

    const newRecipe: MenuRecipe = {
      id: recipe?.id || `recipe-${Date.now()}`,
      code: formData.code || '',
      name: formData.name,
      category: formData.category,
      yield: formData.yield || 0,
      yieldUnit: formData.yieldUnit || 'г',
      costPerUnit: formData.costPerUnit || 0,
      sellingPrice: formData.sellingPrice || 0,
      markup: formData.markup || 0,
      ingredients: recipeIngredients,
      notes: formData.notes || '',
      lastModified: new Date().toISOString(),
      modifiedBy: 'Current User',
      status: formData.status || 'active',
    };

    onSave(newRecipe);
    onClose();
  };

  if (!isOpen) return null;

  const totalIngredientsCost = recipeIngredients.reduce((sum, ing) => sum + ing.totalCost, 0);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={onClose}>
            ‹
          </button>
          <h2 className={styles.title}>
            {recipe ? 'Редагування тех. картки' : 'Додавання тех. картки'}
          </h2>
          <button className={styles.recalcButton}>
            🔄 Розрахувати
          </button>
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
              placeholder="Введіть назву тех. картки"
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
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Ціна приготування</label>
            <select className={styles.select}>
              <option>Без ціну</option>
            </select>
            <p className={styles.helpText}>
              Виберіть, ціну, цифу допускаються на нечислові та правильного списувати інгредієнти з рівня списку
            </p>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Обкладинка</label>
            <div className={styles.imagePlaceholder}></div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" />
              <span>Ватова тех. картка</span>
            </label>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" />
              <span>Не бере участь в знижках</span>
            </label>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Ціна</label>
            <div className={styles.priceInputs}>
              <div className={styles.priceField}>
                <input
                  type="number"
                  value={formData.costPerUnit || 0}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      costPerUnit: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className={styles.priceInput}
                  placeholder="0"
                />
                <span className={styles.currency}>₴</span>
              </div>

              <button className={styles.plusButton}>+</button>

              <div className={styles.priceField}>
                <input
                  type="number"
                  value={formData.markup || 0}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      markup: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className={styles.priceInput}
                  placeholder="0"
                />
                <span className={styles.currency}>%</span>
              </div>

              <span className={styles.equals}>=</span>

              <div className={styles.priceField}>
                <input
                  type="number"
                  value={formData.sellingPrice || 0}
                  readOnly
                  className={styles.priceInput}
                  placeholder="0"
                />
                <span className={styles.currency}>₴</span>
              </div>
            </div>
          </div>

          <div className={styles.ingredientsSection}>
            <h3 className={styles.sectionTitle}>Складники</h3>
            <p className={styles.sectionHint}>
              Інгредієнти та напівфабрикати, з яких складається тех. картка
            </p>

            <div className={styles.ingredientInput}>
              <select
                value={selectedIngredient}
                onChange={(e) => setSelectedIngredient(e.target.value)}
                className={styles.ingredientSelect}
              >
                <option value="">Продукти</option>
                {ingredients.map((ing) => (
                  <option key={ing} value={ing}>
                    {ing}
                  </option>
                ))}
              </select>

              <div className={styles.quantityInputs}>
                <input
                  type="number"
                  value={ingredientQuantity}
                  onChange={(e) => setIngredientQuantity(e.target.value)}
                  className={styles.quantityInput}
                  placeholder="—"
                />

                <input
                  type="text"
                  value={ingredientUnit}
                  onChange={(e) => setIngredientUnit(e.target.value)}
                  className={styles.unitInput}
                  placeholder="0"
                />

                <button
                  className={styles.editButton}
                  onClick={handleAddIngredient}
                >
                  ✏️
                </button>

                <input
                  type="number"
                  className={styles.costInput}
                  placeholder="0"
                  disabled
                />

                <span className={styles.currency}>г</span>
              </div>
            </div>

            <div className={styles.ingredientsList}>
              <div className={styles.ingredientsHeader}>
                <div className={styles.colProduct}>Продукти</div>
                <div className={styles.colQuantity}>Спосіб приготування</div>
                <div className={styles.colBrutto}>Брутто</div>
                <div className={styles.colCost}>Нетто</div>
                <div className={styles.colCostPerUnit}>Собівартість без ПДВ</div>
              </div>

              {recipeIngredients.length === 0 ? (
                <div className={styles.noIngredients}>
                  Виход: 0 г<br />
                  Всього: 0,00 ₴
                </div>
              ) : (
                <>
                  {recipeIngredients.map((ing) => (
                    <div key={ing.id} className={styles.ingredientRow}>
                      <div className={styles.colProduct}>{ing.name}</div>
                      <div className={styles.colQuantity}>—</div>
                      <div className={styles.colBrutto}>{ing.quantity} {ing.unit}</div>
                      <div className={styles.colCost}>0 г</div>
                      <div className={styles.colCostPerUnit}>
                        {ing.totalCost.toFixed(2)} ₴
                        <button
                          className={styles.removeButton}
                          onClick={() => handleRemoveIngredient(ing.id)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className={styles.ingredientsSummary}>
                    <div>Виход: 0 г</div>
                    <div>Всього: {totalIngredientsCost.toFixed(2)} ₴</div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className={styles.additionalSection}>
            <a href="#" className={styles.additionalLink}>
              Додатково ↓
            </a>
          </div>
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
