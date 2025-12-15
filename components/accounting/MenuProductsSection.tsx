import React, { useState, useEffect } from 'react';
import { MenuProduct, ProductCategory } from '../../types/accounting';
import { ProductFormModal } from './ProductFormModal';
import { ImportModal } from './ImportModal';
import { TrashModal } from './TrashModal';
import { getProducts, createProduct, updateProduct, deleteProduct, getCategories } from '../../lib/api-client';
import styles from './MenuProductsSection.module.css';

interface MenuProductsSectionProps { }

export function MenuProductsSection({ }: MenuProductsSectionProps) {
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [categories, setCategoryes] = useState<ProductCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MenuProduct | undefined>();
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{ key: keyof MenuProduct; direction: 'asc' | 'desc' } | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  const handleSort = (key: keyof MenuProduct) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: keyof MenuProduct) => {
    if (!sortConfig || sortConfig.key !== key) return '↕';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getProducts();
      const categoriesData = await getCategories();

      // Deduplicate products by id to avoid key collisions
      const uniqueProducts = Array.from(new Map(data.map((item: any) => [item.id, item])).values()) as MenuProduct[];

      setProducts(uniqueProducts);
      setCategoryes(categoriesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка при завантаженні товарів');
      console.error('Error loading products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // const categories = Array.from(new Set(products.map((row) => row.category)));

  const sortedProducts = React.useMemo(() => {
    let sortableProducts = [...products];
    if (sortConfig !== null) {
      sortableProducts.sort((a, b) => {
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
    return sortableProducts;
  }, [products, sortConfig]);

  const filteredRows = sortedProducts.filter((row) => {
    const matchesSearch = row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.code === searchQuery;
    const matchesCategory = !selectedCategory || row.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredRows.length / itemsPerPage);
  const paginatedRows = filteredRows.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.nameColumn} onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                  Назва {getSortIndicator('name')}
                </th>
                <th className={styles.categoryColumn} onClick={() => handleSort('category')} style={{ cursor: 'pointer' }}>
                  Категорія {getSortIndicator('category')}
                </th>
                <th className={styles.costColumn} onClick={() => handleSort('costPerUnit')} style={{ cursor: 'pointer' }}>
                  Собівартість {getSortIndicator('costPerUnit')}
                </th>
                <th className={styles.priceColumn} onClick={() => handleSort('sellingPrice')} style={{ cursor: 'pointer' }}>
                  Ціна {getSortIndicator('sellingPrice')}
                </th>
                <th className={styles.markupColumn} onClick={() => handleSort('markup')} style={{ cursor: 'pointer' }}>
                  Надбавка {getSortIndicator('markup')}
                </th>
                <th className={styles.actionsColumn}></th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.noData}>
                    Немає даних для відображення
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr key={row.id}>
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
                          onClick={() => handleDeleteProduct(row.id || row._id || '')}
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

      <ProductFormModal
        isOpen={isFormOpen}
        product={editingProduct}
        categories={categories}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveProduct}
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={() => loadProducts()}
        type="products"
        title="Товари"
      />

      <TrashModal
        isOpen={isTrashOpen}
        onClose={() => setIsTrashOpen(false)}
        type="products"
        title="Видалені товари"
        onRestore={() => loadProducts()}
      />
    </>
  );
}
