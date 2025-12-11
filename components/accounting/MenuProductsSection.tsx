import React, { useState, useEffect } from 'react';
import { MenuProduct, ProductCategory } from '../../types/accounting';
import { ProductFormModal } from './ProductFormModal';
import { getProducts, createProduct, updateProduct, deleteProduct, getCategories } from '../../lib/api-client';
import styles from './MenuProductsSection.module.css';

interface MenuProductsSectionProps {}

export function MenuProductsSection({}: MenuProductsSectionProps) {
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [categories, setCategoryes] = useState<ProductCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MenuProduct | undefined>();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getProducts();
      const categoriesData = await getCategories();
      setProducts(data);
      setCategoryes(categoriesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка при завантаженні товарів');
      console.error('Error loading products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // const categories = Array.from(new Set(products.map((row) => row.category)));

  const filteredRows = products.filter((row) => {
    const matchesSearch = row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         row.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || row.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddProduct = async (product: MenuProduct) => {
    try {
      const newProduct = await createProduct(product);
      setProducts([...products, newProduct]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка при створенні товару');
    }
  };

  const handleUpdateProduct = async (product: MenuProduct) => {
    try {
      const updatedProduct = await updateProduct(product.id, product);
      setProducts(products.map((p) => (p.id === product.id ? updatedProduct : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка при оновленні товару');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteProduct(id);
      setProducts(products.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка при видаленні товару');
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toFixed(2);
  };

  const formatMarkup = (markup: number) => {
    return `${markup}%`;
  };

  const handleOpenForm = () => {
    setEditingProduct(undefined);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (product: MenuProduct) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleSaveProduct = async (product: MenuProduct) => {
    if (editingProduct) {
      await handleUpdateProduct(product);
    } else {
      await handleAddProduct(product);
    }
    setIsFormOpen(false);
  };

  return (
    <>
      <section className={styles.card}>
      <div className={styles.headerRow}>
        <div className={styles.titleBlock}>
          <h2 className={styles.title}>Товари</h2>
          <span className={styles.count}>{products.length}</span>
        </div>
        <div className={styles.toolbarRight}>
          <button className={styles.toolbarButton} type="button">
            🏪 Кошик
          </button>
          <button className={styles.toolbarButton} type="button">
            📊 Звіти
          </button>
          <button className={styles.toolbarButton} type="button">
            📥 Експорт
          </button>
          <button className={styles.toolbarButton} type="button">
            🖨️ Друк
          </button>
          <button className={styles.toolbarButton} type="button">
            ⋯
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
          <button className={styles.filterButton}>
            Закладка: Дітячий розважальний...
            <span className={styles.filterArrow}>✕</span>
          </button>
          <button className={styles.filterLink}>+ Фільтр</button>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.codeColumn}>Код</th>
              <th className={styles.nameColumn}>Назва</th>
              <th className={styles.categoryColumn}>Категорія</th>
              <th className={styles.costColumn}>Собівартість без ПДВ</th>
              <th className={styles.priceColumn}>Ціна</th>
              <th className={styles.markupColumn}>Надбавка</th>
              <th className={styles.actionsColumn}></th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.noData}>
                  Немає даних для відображення
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row.id}>
                  <td className={styles.codeColumn}>
                    <div className={styles.codeBadge}>{row.id}</div>
                  </td>
                  <td className={styles.nameColumn}>{row.name}</td>
                  <td className={styles.categoryColumn}>{row.category}</td>
                  <td className={styles.costColumn}>
                    {formatCurrency(row.costPerUnit)} ₴
                  </td>
                  <td className={styles.priceColumn}>
                    {formatCurrency(row.sellingPrice)} ₴
                  </td>
                  <td className={styles.markupColumn}>
                    {formatMarkup(row.markup)}
                  </td>
                  <td className={styles.actionsColumn}>
                    <div className={styles.actions}>
                      <button
                        className={styles.actionLink}
                        onClick={() => handleOpenEditForm(row)}
                      >
                        Ред.
                      </button>
                      <button
                        className={`${styles.actionLink} ${styles.actionDelete}`}
                        onClick={() => handleDeleteProduct(row.id)}
                        title="Видалити"
                      >
                        Видалити
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </section>

      <ProductFormModal
        isOpen={isFormOpen}
        product={editingProduct}
        categories={categories}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveProduct}
      />
    </>
  );
}
