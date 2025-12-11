import React, { useState, useEffect } from 'react';
import { MenuRecipe } from '../../types/accounting';
import { RecipeFormModal } from './RecipeFormModal';
import { getRecipes, createRecipe, updateRecipe, deleteRecipe } from '../../lib/api-client';
import styles from './MenuRecipesSection.module.css';

interface MenuRecipesSectionProps {
  rows?: MenuRecipe[];
  categories?: string[];
  ingredients?: string[];
  onAddRecipe?: (recipe: MenuRecipe) => void;
  onEditRecipe?: (recipe: MenuRecipe) => void;
  onDeleteRecipe?: (id: string) => void;
}

export function MenuRecipesSection({
  rows: initialRows,
  categories: initialCategories,
  ingredients: initialIngredients,
  onAddRecipe,
  onEditRecipe,
  onDeleteRecipe,
}: MenuRecipesSectionProps) {
  const [recipes, setRecipes] = useState<MenuRecipe[]>(initialRows || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<MenuRecipe | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getRecipes();
      setRecipes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка при завантаженні тех. карток');
      console.error('Error loading recipes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRows = recipes.filter((row) =>
    row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    row.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddRecipe = async (recipe: MenuRecipe) => {
    try {
      const newRecipe = await createRecipe(recipe);
      setRecipes([...recipes, newRecipe]);
      onAddRecipe?.(newRecipe);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка при створенні тех. картки');
    }
  };

  const handleEditRecipe = async (recipe: MenuRecipe) => {
    try {
      const updatedRecipe = await updateRecipe(recipe.id, recipe);
      setRecipes(recipes.map((r) => (r.id === recipe.id ? updatedRecipe : r)));
      onEditRecipe?.(updatedRecipe);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка при оновленні тех. картки');
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    try {
      await deleteRecipe(id);
      setRecipes(recipes.filter((r) => r.id !== id));
      onDeleteRecipe?.(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка при видаленні тех. картки');
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toFixed(2);
  };

  const formatMarkup = (markup: number) => {
    return `${markup}%`;
  };

  const toggleExpanded = (id: string) => {
    setExpandedRecipe(expandedRecipe === id ? null : id);
  };

  const handleOpenForm = () => {
    setEditingRecipe(undefined);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (recipe: MenuRecipe) => {
    setEditingRecipe(recipe);
    setIsFormOpen(true);
  };

  const handleSaveRecipe = async (recipe: MenuRecipe) => {
    if (editingRecipe) {
      await handleEditRecipe(recipe);
    } else {
      await handleAddRecipe(recipe);
    }
    setIsFormOpen(false);
  };

  return (
    <>
      <section className={styles.card}>
        <div className={styles.headerRow}>
          <div className={styles.titleBlock}>
            <h2 className={styles.title}>Тех. картки</h2>
            <span className={styles.count}>{recipes.length}</span>
          </div>
          <div className={styles.toolbarRight}>
            <button className={styles.toolbarButton} type="button">
              📥 Експорт
            </button>
            <button className={styles.toolbarButton} type="button">
              🖨️ Друк
            </button>
            <button
              className={`${styles.toolbarButton} ${styles.buttonPrimary}`}
              type="button"
              onClick={handleOpenForm}
            >
              ➕ Додати
            </button>
          </div>
        </div>

      <div className={styles.toolbarRow}>
        <input
          type="text"
          placeholder="🔍 Швидкий пошук"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
        <div className={styles.filterButtons}>
          <button className={styles.filterButton}>
            Категорія
            <span className={styles.filterArrow}>▼</span>
          </button>
          <button className={styles.filterButton}>
            Ціна
            <span className={styles.filterArrow}>▼</span>
          </button>
          <button className={styles.filterLink}>+ Фільтр</button>
        </div>
      </div>

      <div className={styles.recipesList}>
        {filteredRows.length === 0 ? (
          <div className={styles.noData}>Немає даних для відображення</div>
        ) : (
          filteredRows.map((recipe) => (
            <div key={recipe.id} className={styles.recipeCard}>
              <div className={styles.recipeHeader}>
                <div className={styles.recipeTitleBlock}>
                  <div className={styles.codeBadge}>{recipe.code}</div>
                  <div className={styles.recipeTitle}>{recipe.name}</div>
                </div>
                <div className={styles.recipeStats}>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Вихід:</span>
                    <span className={styles.statValue}>
                      {recipe.yield} {recipe.yieldUnit}
                    </span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Собівартість:</span>
                    <span className={styles.statValue}>
                      {formatCurrency(recipe.costPerUnit)} ₴
                    </span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Ціна:</span>
                    <span className={styles.statValue}>
                      {formatCurrency(recipe.sellingPrice)} ₴
                    </span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Надбавка:</span>
                    <span className={styles.statValue}>
                      {formatMarkup(recipe.markup)}
                    </span>
                  </div>
                  <div className={styles.actions}>
                    <button
                      className={styles.actionLink}
                      onClick={() => handleOpenEditForm(recipe)}
                    >
                      Складники
                    </button>
                    <button
                      className={styles.actionLink}
                      onClick={() => handleOpenEditForm(recipe)}
                    >
                      Ред.
                    </button>
                    <button
                      className={`${styles.actionButton} ${styles.actionDelete}`}
                      onClick={() => handleDeleteRecipe(recipe.id)}
                      title="Видалити"
                    >
                      ⋯
                    </button>
                  </div>
                </div>
              </div>

              {recipe.ingredients.length > 0 && (
                <div className={styles.ingredientsSection}>
                  <button
                    className={styles.expandButton}
                    onClick={() => toggleExpanded(recipe.id)}
                  >
                    <span className={styles.expandIcon}>
                      {expandedRecipe === recipe.id ? '▼' : '▶'}
                    </span>
                    <span>Складники та історія редагування</span>
                  </button>

                  {expandedRecipe === recipe.id && (
                    <div className={styles.ingredientsList}>
                      <div className={styles.ingredientsTable}>
                        <div className={styles.tableHeader}>
                          <div className={styles.ingredientName}>Інгредієнт</div>
                          <div className={styles.ingredientQuantity}>Кількість</div>
                          <div className={styles.ingredientCost}>Вартість</div>
                        </div>

                        {recipe.ingredients.map((ingredient) => (
                          <div key={ingredient.id} className={styles.tableRow}>
                            <div className={styles.ingredientName}>
                              {ingredient.name}
                            </div>
                            <div className={styles.ingredientQuantity}>
                              {ingredient.quantity} {ingredient.unit}
                            </div>
                            <div className={styles.ingredientCost}>
                              {formatCurrency(ingredient.totalCost)} ₴
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className={styles.historySection}>
                        <div className={styles.historyItem}>
                          <div className={styles.historyDate}>
                            Перераховано з {recipe.lastModified.split('T')[0]} {recipe.lastModified.split('T')[1]?.substring(0, 5)}
                          </div>
                          <div className={styles.historyAuthor}>
                            Редагування: {recipe.modifiedBy}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      </section>

      {/* <RecipeFormModal
        isOpen={isFormOpen}
        recipe={editingRecipe}
        categories={categories}
        ingredients={ingredients}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveRecipe}
      /> */}
    </>
  );
}
