import React, { useState, useEffect } from 'react';
import { MenuRecipe, RecipeIngredient } from '../../types/accounting';
import styles from './RecipeFormModal.module.css';
import { useToast } from '../ui/ToastContext';

interface RecipeFormModalProps {
  isOpen: boolean;
  recipe?: MenuRecipe;
  categories: string[];
  ingredients: import('../../types/accounting').MenuIngredient[];
  priceSyncEnabled?: boolean; // PRICE SYNC (Этап 4): merge актуальних цін при відкритті
  onClose: () => void;
  onSave: (recipe: MenuRecipe) => void;
}

// Mock stations for now - could be from props later
const COOKING_STATIONS = ['Кухня', 'Бар', 'Кондитерська', 'Холодний цех'];

export function RecipeFormModal({
  isOpen,
  recipe,
  categories,
  ingredients,
  priceSyncEnabled = false,
  onClose,
  onSave,
}: RecipeFormModalProps) {
  const toast = useToast();
  const [formData, setFormData] = useState<Partial<MenuRecipe>>({
    code: '',
    name: '',
    category: '',
    cookingStation: '',
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

  useEffect(() => {
    if (recipe) {
      setFormData(recipe);
      let ings: RecipeIngredient[] = recipe.ingredients || [];

      // PRICE SYNC (Этап 4): merge актуальних цін з довідника при відкритті картки.
      // Техкарти зберігають снапшот ing.costPerUnit — після приходів він застаріває.
      // Матчинг: за справжнім ID (_id/id), fallback — normalized name (як у cascadeUpdateRecipes).
      // Лише коли priceSyncEnabled (flag сервера) і знайдена ціна > 0.
      if (priceSyncEnabled && ings.length > 0 && ingredients.length > 0) {
        const norm = (v: any) => (v || '').toString().toLowerCase().trim();
        ings = ings.map(ing => {
          const match = ingredients.find(i =>
            (ing.id && (i.id === ing.id || i._id === ing.id)) ||
            (norm(i.name) !== '' && norm(i.name) === norm(ing.name))
          );
          const freshCost = Number(match?.costPerUnit) || 0;
          if (!match || freshCost <= 0) return ing;
          const qtyField = Number(ing.gross) || Number(ing.net) || Number(ing.quantity) || 0;
          return {
            ...ing,
            id: (ing.id && !String(ing.id).startsWith('ing-')) ? ing.id : (match._id || match.id || ing.id),
            costPerUnit: freshCost,
            totalCost: freshCost * qtyField,
          };
        });
      }

      setRecipeIngredients(ings);
    } else {
      setFormData({
        code: '',
        name: '',
        category: '',
        cookingStation: '',
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

  // Recalculate totals whenever ingredients change
  useEffect(() => {
    const totalCost = recipeIngredients.reduce((sum, ing) => sum + (ing.totalCost || 0), 0);
    const totalWeight = recipeIngredients.reduce((sum, ing) => sum + (ing.net || 0), 0); // Usually yield is sum of NET weights

    setFormData(prev => {
      // Only update if changed to avoid loop, but here it's safe as we set specific fields
      if (Math.abs(prev.costPerUnit! - totalCost) < 0.01 && Math.abs(prev.yield! - totalWeight) < 0.01) return prev;

      // Also recalculate markup if selling price is set
      let markup = prev.markup;
      if (prev.sellingPrice && totalCost > 0) {
        markup = ((prev.sellingPrice - totalCost) / totalCost) * 100;
      }

      return {
        ...prev,
        costPerUnit: totalCost,
        yield: totalWeight, // Auto-update yield based on net weight
        markup: markup
      };
    });
  }, [recipeIngredients]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    // Handle checkbox
    if (type === 'checkbox') {
      return;
    }

    setFormData((prev) => {
      const newData = { ...prev, [name]: value };

      if (name === 'sellingPrice') {
        const price = parseFloat(value) || 0;
        if (prev.costPerUnit && prev.costPerUnit > 0) {
          newData.markup = ((price - prev.costPerUnit) / prev.costPerUnit) * 100;
        }
      }

      return newData;
    });
  };

  const handleIngredientChange = (id: string, field: keyof RecipeIngredient, value: string | number) => {
    setRecipeIngredients(prev => prev.map(ing => {
      if (ing.id !== id) return ing;

      let updated = { ...ing, [field]: value };

      if (field === 'name') {
        // Look up the selected ingredient
        const selectedIngredient = ingredients.find(i => i.name === value);
        if (selectedIngredient) {
          updated.unit = selectedIngredient.unit;
          updated.costPerUnit = selectedIngredient.costPerUnit;
          // Optionally reset gross/net if needed, or keep as is.
          // Recalculate cost immediately based on new costPerUnit
          updated.totalCost = (Number(updated.costPerUnit) || 0) * (Number(updated.gross) || 0);
        }
      }

      // Recalculate logic
      if (field === 'gross' || field === 'net') {
        // totalCost = costPerUnit * gross (usually you pay for gross)
        updated.totalCost = (Number(updated.costPerUnit) || 0) * (Number(updated.gross) || 0);
      }
      if (field === 'costPerUnit') {
        updated.totalCost = (Number(value) || 0) * (Number(updated.gross) || 0);
      }

      return updated;
    }));
  };

  const addEmptyIngredient = () => {
    const newIngredient: RecipeIngredient = {
      id: `ing-${Date.now()}`,
      name: '',
      method: '-',
      quantity: 0, // Using gross as quantity mapping
      gross: 0,
      net: 0,
      unit: 'г', // default
      costPerUnit: 0,
      totalCost: 0,
    };
    setRecipeIngredients([...recipeIngredients, newIngredient]);
  };

  const removeIngredient = (id: string) => {
    setRecipeIngredients(prev => prev.filter(i => i.id !== id));
  };

  const handleSave = () => {
    if (!formData.name || !formData.category) {
      toast.error('Заповніть обов\'язкові поля (Назва, Категорія)');
      return;
    }

    const newRecipe: MenuRecipe = {
      id: recipe?.id || `recipe-${Date.now()}`,
      code: formData.code || '',
      name: formData.name!,
      category: formData.category!,
      cookingStation: formData.cookingStation || '',
      yield: formData.yield || 0,
      yieldUnit: formData.yieldUnit || 'г',
      costPerUnit: formData.costPerUnit || 0,
      sellingPrice: parseFloat(String(formData.sellingPrice)) || 0,
      markup: formData.markup || 0,
      ingredients: recipeIngredients,
      notes: formData.notes || '',
      lastModified: new Date().toISOString(),
      modifiedBy: 'User', // Placeholder
      status: formData.status || 'active',
    };

    onSave(newRecipe);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button className={styles.backButton} onClick={onClose}>‹</button>
            <h2 className={styles.title}>{recipe ? 'Редагування тех. картки' : 'Створення тех. картки'}</h2>
          </div>
          <button className={styles.printButton}>🖨️ Роздрукувати</button>
        </div>

        <div className={styles.content}>
          {/* Top Form Fields */}
          <div className={styles.topGrid}>
            <div className={styles.fieldRow}>
              <label>Назва</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="Наприклад: Борщ український"
              />
            </div>

            <div className={styles.fieldRow}>
              <label>Категорія</label>
              <select name="category" value={formData.category} onChange={handleInputChange} className={styles.select}>
                <option value="">Оберіть категорію</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className={styles.fieldRow}>
              <label>Цех приготування</label>
              <select name="cookingStation" value={formData.cookingStation} onChange={handleInputChange} className={styles.select}>
                <option value="">Оберіть цех</option>
                {COOKING_STATIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className={styles.hint}>Виберіть цех, щоб друкувати на нього бігунки</div>
            </div>

            <div className={styles.fieldRow} style={{ alignItems: 'flex-start' }}>
              <label>Обкладинка</label>
              <div className={styles.imagePlaceholder}>БЧ</div>
            </div>

            <div className={styles.fieldRow}>
              <label>Опції</label>
              <div className={styles.optionsGroup}>
                <label><input type="checkbox" /> Вагова тех. картка</label>
                <label><input type="checkbox" /> Не бере участь в знижках</label>
              </div>
            </div>

            <div className={styles.fieldRow}>
              <label>Ціна</label>
              <div className={styles.priceRow}>
                <input
                  type="number"
                  name="sellingPrice"
                  value={formData.sellingPrice}
                  onChange={handleInputChange}
                  className={styles.priceInput}
                />
                <span className={styles.currency}>₴</span>

                <div className={styles.markupInfo}>
                  <span className={styles.markupLabel}>Націнка без податку</span>
                  <span className={styles.markupValue}>{formData.markup?.toFixed(0)}%</span>
                </div>
                <div className={styles.markupInfo}>
                  <span className={styles.markupLabel}>Собівартість без ПДВ</span>
                  <span className={styles.markupValue}>{formData.costPerUnit?.toFixed(2)} ₴</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ingredients Section */}
          <div className={styles.ingredientsSection}>
            <h3 className={styles.sectionTitle}>Складники</h3>
            <p className={styles.sectionSubtitle}>Інгредієнти та напівфабрикати, з яких складається тех. картка</p>

            <div className={styles.tableHeader}>
              <div className={styles.colName}>Продукти</div>
              <div className={styles.colMethod}>Спосіб приготування</div>
              <div className={styles.colGross}>Брутто</div>
              <div className={styles.colNet}>Нетто</div>
              <div className={styles.colCost}>Собівартість без ПДВ</div>
            </div>

            <div className={styles.tableBody}>
              {recipeIngredients.map((ing) => (
                <div key={ing.id} className={styles.tableRow}>
                  <div className={styles.colName}>
                    <input
                      list="ingredients-list"
                      value={ing.name}
                      onChange={(e) => handleIngredientChange(ing.id, 'name', e.target.value)}
                      className={styles.tableInput}
                      placeholder="Пошук продукту"
                    />
                  </div>
                  <div className={styles.colMethod}>
                    <input
                      value={ing.method || '-'}
                      onChange={(e) => handleIngredientChange(ing.id, 'method', e.target.value)}
                      className={styles.tableInput}
                    />
                  </div>
                  <div className={styles.colGross}>
                    <div className={styles.unitWrapper}>
                      <input
                        type="number"
                        value={ing.gross || 0}
                        onChange={(e) => handleIngredientChange(ing.id, 'gross', parseFloat(e.target.value))}
                        className={styles.numberInput}
                      />
                      <span className={styles.unitLabel}>{ing.unit}</span>
                    </div>
                  </div>
                  <div className={styles.colNet}>
                    <div className={styles.unitWrapper}>
                      <input
                        type="number"
                        value={ing.net || 0}
                        onChange={(e) => handleIngredientChange(ing.id, 'net', parseFloat(e.target.value))}
                        className={styles.numberInput}
                      />
                      <span className={styles.unitLabel}>{"г"}</span>
                    </div>
                  </div>
                  <div className={styles.colCost}>
                    <span>{ing.totalCost?.toFixed(2)} ₴</span>
                    <button onClick={() => removeIngredient(ing.id)} className={styles.removeBtn}>×</button>
                  </div>
                </div>
              ))}

              <button onClick={addEmptyIngredient} className={styles.addIngredientBtn}>
                + Додати інгредієнт
              </button>
            </div>

            <div className={styles.tableFooter}>
              <div className={styles.footerTotal}>
                Вихід: {formData.yield} г
              </div>
              <div className={styles.footerTotal}>
                Всього: {formData.costPerUnit?.toFixed(2)} ₴
              </div>
            </div>
          </div>

          <datalist id="ingredients-list">
            {ingredients.map(ing => <option key={ing.id} value={ing.name} />)}
          </datalist>

          {/* Modifiers placeholder */}
          {/* <div className={styles.modifiersSection}>
            <h3 className={styles.sectionTitle}>Модифікатори</h3>
            <p className={styles.sectionSubtitle}>Вибір серед різновидів або з можливістю додати додаткові інгредієнти</p>
            <button className={styles.addModifierBtn}>+ Додати набір модифікаторів...</button>
          </div> */}

        </div>

        <div className={styles.footer}>
          {/* Keeping original save layout */}
          <button className={styles.saveButton} onClick={handleSave}>
            Зберегти
          </button>
        </div>
      </div>
    </div>
  );
}
