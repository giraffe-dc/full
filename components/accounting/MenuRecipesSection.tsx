import React, { useState, useEffect } from 'react';
import { MenuRecipe } from '../../types/accounting';
import { RecipeFormModal } from './RecipeFormModal';
import { getRecipes, createRecipe, updateRecipe, deleteRecipe, getCategories, getIngredients } from '../../lib/api-client';
import { ImportModal } from './ImportModal';
import { TrashModal } from './TrashModal';
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
  const [categories, setCategories] = useState<string[]>(initialCategories || []);
  const [ingredientsList, setIngredientsList] = useState<string[]>(initialIngredients || []);

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<MenuRecipe | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sorting state
  const [sortConfig, setSortConfig] = useState<{ key: keyof MenuRecipe; direction: 'asc' | 'desc' } | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load recipes
      const recipesData = await getRecipes();
      setRecipes(recipesData);

      // Load additional data if not provided props (or just refresh it)
      // For now, let's always fetch to ensure freshness or if props are missing
      if (!initialCategories || initialCategories.length === 0) {
        try {
          const cats = await getCategories();
          setCategories(cats.map(c => c.name));
        } catch (e) { console.error('Failed to load categories', e); }
      }

      if (!initialIngredients || initialIngredients.length === 0) {
        try {
          const ings = await getIngredients();
          setIngredientsList(ings.map(i => i.name));
        } catch (e) { console.error('Failed to load ingredients', e); }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка при завантаженні даних');
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (key: keyof MenuRecipe) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: keyof MenuRecipe) => {
    if (!sortConfig || sortConfig.key !== key) return '↕';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const sortedRecipes = React.useMemo(() => {
    let sortableRecipes = [...recipes];
    if (sortConfig !== null) {
      sortableRecipes.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === undefined && bValue === undefined) return 0;
        if (aValue === undefined) return 1;
        if (bValue === undefined) return -1;

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableRecipes;
  }, [recipes, sortConfig]);

  const filteredRows = sortedRecipes.filter((row) =>
    row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    row.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredRows.length / itemsPerPage);
  const paginatedRows = filteredRows.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
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
            <button
              className={styles.toolbarButton}
              type="button"
              onClick={() => setIsImportModalOpen(true)}
            >
              📥 Імпорт
            </button>
            <button
              className={styles.toolbarButton}
              type="button"
              onClick={() => setIsTrashOpen(true)}
              title="Кошик"
            >
              🗑️ Кошик
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
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '80px', cursor: 'pointer' }} onClick={() => handleSort('code')}>
                  Код {getSortIndicator('code')}
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('name')}>
                  Назва {getSortIndicator('name')}
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('category')}>
                  Категорія {getSortIndicator('category')}
                </th>
                <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('yield')}>
                  Вихід {getSortIndicator('yield')}
                </th>
                <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('costPerUnit')}>
                  Собівартість {getSortIndicator('costPerUnit')}
                </th>
                <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('sellingPrice')}>
                  Ціна {getSortIndicator('sellingPrice')}
                </th>
                <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('markup')}>
                  Націнка {getSortIndicator('markup')}
                </th>
                <th style={{ width: '100px', textAlign: 'center' }}>Дії</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                    Немає даних
                  </td>
                </tr>
              ) : (
                paginatedRows.map((recipe) => (
                  <React.Fragment key={recipe.id}>
                    <tr
                      className={expandedRecipe === recipe.id ? styles.expandedRowParent : undefined}
                      onClick={() => toggleExpanded(recipe.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td><span className={styles.codeBadge}>{recipe.code}</span></td>
                      <td style={{ fontWeight: 500 }}>{recipe.name}</td>
                      <td><span className={styles.categoryBadge}>{recipe.category}</span></td>
                      <td style={{ textAlign: 'right' }}>{recipe.yield} {recipe.yieldUnit}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(recipe.costPerUnit)} ₴</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(recipe.sellingPrice)} ₴</td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{
                          color: recipe.markup < 100 ? '#eab308' : '#22c55e',
                          fontWeight: 600
                        }}>
                          {formatMarkup(recipe.markup)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                          <button
                            className={styles.actionButton}
                            onClick={() => handleOpenEditForm(recipe)}
                            title="Редагувати"
                          >
                            ✏️
                          </button>
                          <button
                            className={`${styles.actionButton} ${styles.actionDelete}`}
                            onClick={() => handleDeleteRecipe(recipe.id || recipe._id || '')}
                            title="Видалити"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedRecipe === recipe.id && (
                      <tr className={styles.expandedRow}>
                        <td colSpan={8} style={{ padding: '0 0 20px 0', background: '#f8fafc' }}>
                          <div style={{ padding: '15px 25px', borderBottom: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: '#475569' }}>
                              Склад рецептури:
                            </div>
                            <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                              <thead style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                                <tr>
                                  <th style={{ padding: '8px', textAlign: 'left' }}>Інгредієнт</th>
                                  <th style={{ padding: '8px', textAlign: 'left' }}>Спосіб обробки</th>
                                  <th style={{ padding: '8px', textAlign: 'right' }}>Брутто</th>
                                  <th style={{ padding: '8px', textAlign: 'right' }}>Нетто</th>
                                  <th style={{ padding: '8px', textAlign: 'right' }}>Вартість</th>
                                </tr>
                              </thead>
                              <tbody>
                                {recipe.ingredients && recipe.ingredients.length > 0 ? (
                                  recipe.ingredients.map((ing, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: 'white' }}>
                                      <td style={{ padding: '8px' }}>{ing.name}</td>
                                      <td style={{ padding: '8px', color: '#64748b' }}>{ing.method || '-'}</td>
                                      <td style={{ padding: '8px', textAlign: 'right' }}>{ing.gross} {ing.unit}</td>
                                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{ing.net} {ing.unit}</td>
                                      <td style={{ padding: '8px', textAlign: 'right' }}>
                                        {((ing.costPerUnit || 0) * (ing.gross || ing.quantity || 0)).toFixed(2)} ₴
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={5} style={{ padding: '15px', textAlign: 'center', color: '#94a3b8' }}>
                                      Складників не додано
                                    </td>
                                  </tr>
                                )}
                                <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                                  <td colSpan={4} style={{ padding: '10px', textAlign: 'right' }}>Разом собівартість:</td>
                                  <td style={{ padding: '10px', textAlign: 'right' }}>{formatCurrency(recipe.costPerUnit)} ₴</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className={styles.paginationRow} style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#6b7280' }}>
            <span>Показати:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{ padding: '4px', borderRadius: '4px', border: '1px solid #d1d5db' }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>на сторінці</span>
            <span style={{ marginLeft: '10px' }}>Всього: {filteredRows.length}</span>
          </div>

          <div style={{ display: 'flex', gap: '5px' }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={styles.toolbarButton}
              style={{ padding: '4px 8px', opacity: currentPage === 1 ? 0.5 : 1 }}
            >
              ←
            </button>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '13px' }}>
              Сторінка {currentPage} з {Math.max(totalPages, 1)}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className={styles.toolbarButton}
              style={{ padding: '4px 8px', opacity: currentPage >= totalPages ? 0.5 : 1 }}
            >
              →
            </button>
          </div>
        </div>
      </section>

      <RecipeFormModal
        isOpen={isFormOpen}
        recipe={editingRecipe}
        categories={categories}
        ingredients={ingredientsList}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveRecipe}
      />
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={() => loadData()}
        type="recipes"
        title="Тех. картки"
      />

      <TrashModal
        isOpen={isTrashOpen}
        onClose={() => setIsTrashOpen(false)}
        type="recipes"
        title="Видалені тех. картки"
        onRestore={() => loadData()}
      />
    </>
  );
}
