import React, { useState, useEffect } from 'react';
import { ProductCategory } from '../../types/accounting';
import { CategoryFormModal } from './CategoryFormModal';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../lib/api-client';
import styles from './MenuProductCategoriesSection.module.css';

interface MenuProductCategoriesSectionProps {}

export function MenuProductCategoriesSection({}: MenuProductCategoriesSectionProps) {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка при завантаженні категорій');
      console.error('Error loading categories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRows = categories.filter((row) =>
    row.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const parentCategories = categories.filter((cat) => !cat.parentCategory);

  const handleOpenForm = () => {
    setEditingCategory(undefined);
    setIsFormOpen(true);
  };

  const handleEditCategory = (category: ProductCategory) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const handleAddCategory = async (category: ProductCategory) => {
    try {
      const newCategory = await createCategory(category);
      setCategories([...categories, newCategory]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка при створенні категорії');
    }
  };

  const handleUpdateCategory = async (category: ProductCategory) => {
    try {
      const updatedCategory = await updateCategory(category.id, category);
      setCategories(categories.map((c) => (c.id === category.id ? updatedCategory : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка при оновленні категорії');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategory(id);
      setCategories(categories.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка при видаленні категорії');
    }
  };

  const handleSaveCategory = async (category: ProductCategory) => {
    if (editingCategory) {
      await handleUpdateCategory(category);
    } else {
      await handleAddCategory(category);
    }
    setIsFormOpen(false);
  };

  const getCategoryHierarchy = (category: ProductCategory): string => {
    if (!category.parentCategory) {
      return category.name;
    }
    const parent = categories.find((c) => c.id === category.parentCategory);
    return parent ? `${parent.name} > ${category.name}` : category.name;
  };

  return (
    <>
      <section className={styles.card}>
        <div className={styles.headerRow}>
          <div className={styles.titleBlock}>
            <h2 className={styles.title}>Категорії товарів та тех. карток</h2>
            <span className={styles.count}>{categories.length}</span>
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
            <button className={styles.filterLink}>+ Фільтр</button>
          </div>
        </div>

        <div className={styles.categoriesList}>
          {filteredRows.length === 0 ? (
            <div className={styles.noData}>Немає даних для відображення</div>
          ) : (
            <div className={styles.categoriesGrid}>
              {filteredRows.map((category) => (
                <div key={category.id} className={styles.categoryCard}>
                  <div className={styles.categoryImage}>
                    {category.image ? (
                      <img src={category.image} alt={category.name} />
                    ) : (
                      <div className={styles.imagePlaceholder}></div>
                    )}
                  </div>

                  <div className={styles.categoryContent}>
                    <h3 className={styles.categoryName}>{category.name}</h3>
                    {category.description && (
                      <p className={styles.categoryDescription}>{category.description}</p>
                    )}
                    {category.parentCategory && (
                      <p className={styles.categoryParent}>
                        Батьківська категорія: {categories.find((c) => c.id === category.parentCategory)?.name}
                      </p>
                    )}
                    <div className={styles.categoryStatus}>
                      <span className={`${styles.statusBadge} ${styles[category.status]}`}>
                        {category.status === 'active' ? '✓ Активна' : '✗ Неактивна'}
                      </span>
                    </div>
                  </div>

                  <div className={styles.categoryActions}>
                    <button
                      className={styles.actionLink}
                      onClick={() => handleEditCategory(category)}
                    >
                      Ред.
                    </button>
                    <button
                      className={`${styles.actionButton} ${styles.actionDelete}`}
                      onClick={() => handleDeleteCategory(category.id)}
                      title="Видалити"
                    >
                      ⋯
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <CategoryFormModal
        isOpen={isFormOpen}
        category={editingCategory}
        parentCategories={parentCategories}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveCategory}
      />
    </>
  );
}
