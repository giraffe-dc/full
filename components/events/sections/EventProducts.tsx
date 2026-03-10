"use client";

import { Product, Recipe, SelectedProduct, ProductFilter, FilteredProduct } from '../EventFormModal.types';
import styles from '../EventFormModal.module.css';

interface EventProductsProps {
  products: Product[];
  recipes: Recipe[];
  selectedProducts: SelectedProduct[];
  searchQuery: string;
  filter: ProductFilter;
  filteredProducts: FilteredProduct[];
  productsTotal: number;
  onToggleProduct: (product: Product | Recipe) => void;
  onUpdateQuantity: (index: number, quantity: number) => void;
  onRemoveProduct: (index: number) => void;
  onSearchChange: (query: string) => void;
  onFilterChange: (filter: ProductFilter) => void;
}

export function EventProducts({
  products,
  recipes,
  selectedProducts,
  searchQuery,
  filter,
  filteredProducts,
  productsTotal,
  onToggleProduct,
  onUpdateQuantity,
  onRemoveProduct,
  onSearchChange,
  onFilterChange,
}: EventProductsProps) {
  console.log('filteredProducts', selectedProducts)
  return (
    <div className={styles.productsSection}>
      <div className={styles.productsHeader}>
        <h4>Оберіть товари/послуги</h4>
        <div className={styles.productsControls}>
          <input
            type="text"
            placeholder="🔍 Пошук..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={styles.searchInput}
          />
          <div className={styles.filterButtons}>
            <button
              type="button"
              className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
              onClick={() => onFilterChange('all')}
            >
              Всі
            </button>
            <button
              type="button"
              className={`${styles.filterBtn} ${filter === 'products' ? styles.active : ''}`}
              onClick={() => onFilterChange('products')}
            >
              🏷️ Товари
            </button>
            <button
              type="button"
              className={`${styles.filterBtn} ${filter === 'recipes' ? styles.active : ''}`}
              onClick={() => onFilterChange('recipes')}
            >
              🍽️ Техкартки
            </button>
          </div>
        </div>
      </div>
      
      <div className={styles.productsList}>
        {filteredProducts.length === 0 ? (
          <div className={styles.emptyProducts}>
            <p>Нічого не знайдено</p>
          </div>
        ) : (
          filteredProducts.map(item => (
            <div
              key={item._id}
              className={`${styles.productItem} ${selectedProducts.find(p => p.productId === item.id) ? styles.selected : ''}`}
              onClick={() => onToggleProduct(item)}
            >
              <div className={styles.productInfo}>
                <span className={styles.productName}>{item.name}</span>
                <span className={styles.productType}>
                  {item.type === 'product' ? '🏷️ Товар' : '🍽️ Техкартка'}
                </span>
              </div>
              <span className={styles.productPrice}>{item.sellingPrice} ₴</span>
            </div>
          ))
        )}
      </div>

      {selectedProducts.length > 0 && (
        <div className={styles.selectedProducts}>
          <h4>✅ Обрано ({selectedProducts.length})</h4>
          <div className={styles.selectedList}>
            {selectedProducts.map((item, index) => (
              <div key={index} className={styles.selectedItem}>
                <span className={styles.selectedName}>{item.name}</span>
                <div className={styles.selectedControls}>
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                    className={styles.qtyBtn}
                    disabled={item.quantity <= 1}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => onUpdateQuantity(index, parseInt(e.target.value) || 1)}
                    className={styles.quantityInput}
                    min="1"
                  />
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                    className={styles.qtyBtn}
                  >
                    +
                  </button>
                  <span className={styles.selectedPrice}>{item.price * item.quantity} ₴</span>
                  <button
                    type="button"
                    onClick={() => onRemoveProduct(index)}
                    className={styles.removeProductBtn}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.selectedTotal}>
            <span>Разом:</span>
            <span>{productsTotal} ₴</span>
          </div>
        </div>
      )}

      <div className={styles.totalsSection}>
        <div className={styles.totalRow}>
          <span>Товари/Послуги:</span>
          <span className={styles.subtotal}>{productsTotal} ₴</span>
        </div>
      </div>
    </div>
  );
}
