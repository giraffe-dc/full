// Hook для управління продуктами

import { useState, useEffect, useMemo } from 'react';
import { Product, Recipe, SelectedProduct, ProductFilter, FilteredProduct, UseEventProductsReturn } from './EventFormModal.types';

export function useEventProducts(event?: any | null): UseEventProductsReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<ProductFilter>('all');

  // Fetch products and recipes
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, recipesRes] = await Promise.all([
          fetch('/api/accounting/products?status=active'),
          fetch('/api/accounting/recipes?status=active'),
        ]);
        
        const productsData = await productsRes.json();
        const recipesData = await recipesRes.json();
        
        if (productsData.success) {
          setProducts(productsData.data);
        }
        if (recipesData.success) {
          setRecipes(recipesData.data);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };
    fetchData();
  }, []);

  // Load products from event when editing
  useEffect(() => {
    if (event?.customServices && event.customServices.length > 0) {
      const loadedProducts = event.customServices.map((service: any) => {
        // Find correct category if it's currently "events" or "food"
        let categoryId = service.category;
        if (!categoryId || categoryId === 'events' || categoryId === 'food') {
          const product = products.find(p => p.id === service.id);
          const recipe = recipes.find(r => r.id === service.id);
          if (product) categoryId = product.category;
          else if (recipe) categoryId = recipe.category;
        }

        return {
          productId: service.id,
          name: service.name,
          categoryId: categoryId,
          quantity: service.quantity,
          price: service.unitPrice,
        };
      });
      setSelectedProducts(loadedProducts);
    }
  }, [event, products, recipes]);

  // Also load products from check if event has assignedRooms (table)
  useEffect(() => {
    if (event?.assignedRooms && event.assignedRooms.length > 0) {
      const tableId = event.assignedRooms[0].resourceName;
      if (tableId) {
        // Fetch ALL checks for this table (not just open) to find the linked check
        fetch(`/api/cash-register/checks?tableId=${tableId}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data.length > 0) {
              // Find the most recent check
              const check = data.data.sort((a: any, b: any) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              )[0];
              
              if (check.items && check.items.length > 0) {
                const checkProducts = check.items.map((item: any) => {
                  let categoryId = item.category;
                  if (!categoryId || categoryId === 'events' || categoryId === 'food') {
                    const product = products.find(p => p.id === (item.productId || item.serviceId));
                    const recipe = recipes.find(r => r.id === (item.productId || item.serviceId));
                    if (product) categoryId = product.category;
                    else if (recipe) categoryId = recipe.category;
                  }

                  return {
                    productId: item.productId || item.serviceId,
                    name: item.serviceName,
                    categoryId: categoryId,
                    quantity: item.quantity,
                    price: item.price,
                  };
                });
                setSelectedProducts(checkProducts);
                console.log('📦 Loaded products from check (with re-hydration):', checkProducts);
              }
            }
          })
          .catch(error => console.error('Error loading check products:', error));
      }
    }
  }, [event, products, recipes]);

  // Filter products
  const filteredProducts = useMemo(() => {
    const allItems: FilteredProduct[] = [
      ...products.map(p => ({ ...p, type: 'product' as const, uniqueId: `prod-${p.id}` })),
      ...recipes.map(r => ({ ...r, type: 'recipe' as const, uniqueId: `recipe-${r.id}` })),
    ];

    return allItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filter === 'all' || 
        (filter === 'products' && item.type === 'product') ||
        (filter === 'recipes' && item.type === 'recipe');
      return matchesSearch && matchesFilter;
    });
  }, [products, recipes, searchQuery, filter]);

  // Toggle product selection
  const toggleProduct = (product: Product | Recipe) => {
    const existingIndex = selectedProducts.findIndex(p => p.productId === product.id);
    
    if (existingIndex >= 0) {
      removeProduct(existingIndex);
    } else {
      setSelectedProducts(prev => [...prev, {
        productId: product.id,
        name: product.name,
        categoryId: product.category,
        quantity: 1,
        price: product.sellingPrice,
      }]);
    }
  };

  // Update quantity
  const updateQuantity = (index: number, quantity: number) => {
    setSelectedProducts(prev => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], quantity: Math.max(1, quantity) };
      }
      return updated;
    });
  };

  // Remove product
  const removeProduct = (index: number) => {
    setSelectedProducts(prev => prev.filter((_, i) => i !== index));
  };

  // Calculate total
  const total = useMemo(() => {
    return selectedProducts.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [selectedProducts]);

  // Calculate items count
  const itemsCount = useMemo(() => {
    return selectedProducts.reduce((sum, item) => sum + item.quantity, 0);
  }, [selectedProducts]);

  return {
    products,
    recipes,
    selectedProducts,
    searchQuery,
    filter,
    filteredProducts,
    toggleProduct,
    updateQuantity,
    removeProduct,
    setSearchQuery,
    setFilter,
    total,
    itemsCount,
  };
}
