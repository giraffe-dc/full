import { MenuProduct, MenuRecipe, MenuIngredient, ProductCategory, ClientRow, StaffRow, PaymentRow, ReceiptRow, CashShift, SalaryRow } from '@/types/accounting';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
}

// ============ INGREDIENTS API ============

export async function getIngredients(filters?: {
  category?: string;
  status?: string;
}): Promise<MenuIngredient[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.status) params.append('status', filters.status);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/accounting/ingredients${query}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<MenuIngredient[]> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при отриманні інгредієнтів');
    }

    return result.data || [];
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    throw error;
  }
}

export async function createIngredient(ingredient: Omit<MenuIngredient, 'id'>): Promise<MenuIngredient> {
  try {
    const response = await fetch('/api/accounting/ingredients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ingredient),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<MenuIngredient> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при створенні інгредієнта');
    }

    return result.data!;
  } catch (error) {
    console.error('Error creating ingredient:', error);
    throw error;
  }
}

export async function updateIngredient(id: string, ingredient: Partial<MenuIngredient>): Promise<MenuIngredient> {
  try {
    const response = await fetch(`/api/accounting/ingredients/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ingredient),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<MenuIngredient> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при оновленні інгредієнта');
    }

    return result.data!;
  } catch (error) {
    console.error('Error updating ingredient:', error);
    throw error;
  }
}

export async function deleteIngredient(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/accounting/ingredients/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<void> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при видаленні інгредієнта');
    }
  } catch (error) {
    console.error('Error deleting ingredient:', error);
    throw error;
  }
}

// ============ PRODUCTS API ============

export async function getProducts(filters?: {
  category?: string;
  status?: string;
}): Promise<MenuProduct[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.status) params.append('status', filters.status);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/accounting/products${query}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<MenuProduct[]> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при отриманні товарів');
    }

    return result.data || [];
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
}

export async function getProduct(id: string): Promise<MenuProduct> {
  try {
    const response = await fetch(`/api/accounting/products/${id}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<MenuProduct> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при отриманні товару');
    }

    return result.data!;
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
}

export async function createProduct(product: Omit<MenuProduct, 'id'>): Promise<MenuProduct> {
  try {
    const response = await fetch('/api/accounting/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<MenuProduct> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при створенні товару');
    }

    return result.data!;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
}

export async function updateProduct(id: string, product: Partial<MenuProduct>): Promise<MenuProduct> {
  try {
    const response = await fetch(`/api/accounting/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<MenuProduct> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при оновленні товару');
    }

    return result.data!;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

export async function deleteProduct(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/accounting/products/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<void> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при видаленні товару');
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

// ============ RECIPES API ============

export async function getRecipes(filters?: {
  category?: string;
  status?: string;
}): Promise<MenuRecipe[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.status) params.append('status', filters.status);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/accounting/recipes${query}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<MenuRecipe[]> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при отриманні тех. карток');
    }

    return result.data || [];
  } catch (error) {
    console.error('Error fetching recipes:', error);
    throw error;
  }
}

export async function getRecipe(id: string): Promise<MenuRecipe> {
  try {
    const response = await fetch(`/api/accounting/recipes/${id}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<MenuRecipe> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при отриманні тех. картки');
    }

    return result.data!;
  } catch (error) {
    console.error('Error fetching recipe:', error);
    throw error;
  }
}

export async function createRecipe(recipe: Omit<MenuRecipe, 'id'>): Promise<MenuRecipe> {
  try {
    const response = await fetch('/api/accounting/recipes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(recipe),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<MenuRecipe> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при створенні тех. картки');
    }

    return result.data!;
  } catch (error) {
    console.error('Error creating recipe:', error);
    throw error;
  }
}

export async function updateRecipe(id: string, recipe: Partial<MenuRecipe>): Promise<MenuRecipe> {
  try {
    const response = await fetch(`/api/accounting/recipes/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(recipe),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<MenuRecipe> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при оновленні тех. картки');
    }

    return result.data!;
  } catch (error) {
    console.error('Error updating recipe:', error);
    throw error;
  }
}

export async function deleteRecipe(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/accounting/recipes/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<void> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при видаленні тех. картки');
    }
  } catch (error) {
    console.error('Error deleting recipe:', error);
    throw error;
  }
}

// ============ CATEGORIES API ============

export async function getCategories(filters?: {
  parentCategory?: string | null;
  status?: string;
}): Promise<ProductCategory[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.parentCategory !== undefined) {
      params.append('parentCategory', filters.parentCategory || '');
    }
    if (filters?.status) params.append('status', filters.status);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/accounting/categories${query}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<ProductCategory[]> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при отриманні категорій');
    }

    return result.data || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
}

export async function getCategory(id: string): Promise<ProductCategory> {
  try {
    const response = await fetch(`/api/accounting/categories/${id}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<ProductCategory> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при отриманні категорії');
    }

    return result.data!;
  } catch (error) {
    console.error('Error fetching category:', error);
    throw error;
  }
}

export async function createCategory(category: Omit<ProductCategory, 'id' | 'createdAt'>): Promise<ProductCategory> {
  try {
    const response = await fetch('/api/accounting/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(category),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<ProductCategory> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при створенні категорії');
    }

    return result.data!;
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
}

export async function updateCategory(id: string, category: Partial<ProductCategory>): Promise<ProductCategory> {
  try {
    const response = await fetch(`/api/accounting/categories/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(category),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<ProductCategory> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при оновленні категорії');
    }

    return result.data!;
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
}

export async function deleteCategory(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/accounting/categories/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<void> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при видаленні категорії');
    }
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
}

// ============ CLIENTS API ============

export async function getClients(filters?: {
  status?: string;
}): Promise<ClientRow[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/accounting/clients${query}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<ClientRow[]> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при отриманні клієнтів');
    }

    return result.data || [];
  } catch (error) {
    console.error('Error fetching clients:', error);
    throw error;
  }
}

export async function createClient(client: Omit<ClientRow, 'id'>): Promise<ClientRow> {
  try {
    const response = await fetch('/api/accounting/clients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(client),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<ClientRow> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при створенні клієнта');
    }

    return result.data!;
  } catch (error) {
    console.error('Error creating client:', error);
    throw error;
  }
}

export async function updateClient(id: string, client: Partial<ClientRow>): Promise<ClientRow> {
  try {
    const response = await fetch(`/api/accounting/clients/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(client),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<ClientRow> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при оновленні клієнта');
    }

    return result.data!;
  } catch (error) {
    console.error('Error updating client:', error);
    throw error;
  }
}

export async function deleteClient(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/accounting/clients/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<void> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при видаленні клієнта');
    }
  } catch (error) {
    console.error('Error deleting client:', error);
    throw error;
  }
}

// ============ STAFF API ============

export async function getStaff(filters?: {
  status?: string;
}): Promise<StaffRow[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/accounting/staff${query}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<StaffRow[]> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при отриманні персоналу');
    }

    return result.data || [];
  } catch (error) {
    console.error('Error fetching staff:', error);
    throw error;
  }
}

export async function createStaff(staff: Omit<StaffRow, 'id'>): Promise<StaffRow> {
  try {
    const response = await fetch('/api/accounting/staff', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(staff),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<StaffRow> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при створенні працівника');
    }

    return result.data!;
  } catch (error) {
    console.error('Error creating staff:', error);
    throw error;
  }
}

export async function updateStaff(id: string, staff: Partial<StaffRow>): Promise<StaffRow> {
  try {
    const response = await fetch(`/api/accounting/staff/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(staff),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<StaffRow> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при оновленні працівника');
    }

    return result.data!;
  } catch (error) {
    console.error('Error updating staff:', error);
    throw error;
  }
}

export async function deleteStaff(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/accounting/staff/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<void> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при видаленні працівника');
    }
  } catch (error) {
    console.error('Error deleting staff:', error);
    throw error;
  }
}

// ============ PAYMENTS API ============

export async function getPayments(filters?: {
  status?: string;
}): Promise<PaymentRow[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/accounting/payments${query}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<PaymentRow[]> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при отриманні платежів');
    }

    return result.data || [];
  } catch (error) {
    console.error('Error fetching payments:', error);
    throw error;
  }
}

export async function createPayment(payment: Omit<PaymentRow, 'id'>): Promise<PaymentRow> {
  try {
    const response = await fetch('/api/accounting/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payment),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<PaymentRow> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при створенні платежу');
    }

    return result.data!;
  } catch (error) {
    console.error('Error creating payment:', error);
    throw error;
  }
}

export async function updatePayment(id: string, payment: Partial<PaymentRow>): Promise<PaymentRow> {
  try {
    const response = await fetch(`/api/accounting/payments/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payment),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<PaymentRow> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при оновленні платежу');
    }

    return result.data!;
  } catch (error) {
    console.error('Error updating payment:', error);
    throw error;
  }
}

export async function deletePayment(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/accounting/payments/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<void> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при видаленні платежу');
    }
  } catch (error) {
    console.error('Error deleting payment:', error);
    throw error;
  }
}

// ============ RECEIPTS API ============

export async function getReceipts(filters?: {
  status?: string;
}): Promise<ReceiptRow[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/accounting/receipts${query}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<ReceiptRow[]> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при отриманні чеків');
    }

    return result.data || [];
  } catch (error) {
    console.error('Error fetching receipts:', error);
    throw error;
  }
}

export async function createReceipt(receipt: Omit<ReceiptRow, 'id'>): Promise<ReceiptRow> {
  try {
    const response = await fetch('/api/accounting/receipts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(receipt),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<ReceiptRow> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при створенні чека');
    }

    return result.data!;
  } catch (error) {
    console.error('Error creating receipt:', error);
    throw error;
  }
}

export async function updateReceipt(id: string, receipt: Partial<ReceiptRow>): Promise<ReceiptRow> {
  try {
    const response = await fetch(`/api/accounting/receipts/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(receipt),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<ReceiptRow> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при оновленні чека');
    }

    return result.data!;
  } catch (error) {
    console.error('Error updating receipt:', error);
    throw error;
  }
}

export async function deleteReceipt(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/accounting/receipts/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<void> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при видаленні чека');
    }
  } catch (error) {
    console.error('Error deleting receipt:', error);
    throw error;
  }
}

// ============ CASH SHIFTS API ============

export async function getCashShifts(filters?: {
  status?: string;
}): Promise<CashShift[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/accounting/cash-shifts${query}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<CashShift[]> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при отриманні касових змін');
    }

    return result.data || [];
  } catch (error) {
    console.error('Error fetching cash shifts:', error);
    throw error;
  }
}

export async function createCashShift(shift: Omit<CashShift, 'id'>): Promise<CashShift> {
  try {
    const response = await fetch('/api/accounting/cash-shifts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(shift),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<CashShift> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при створенні касової зміни');
    }

    return result.data!;
  } catch (error) {
    console.error('Error creating cash shift:', error);
    throw error;
  }
}

export async function updateCashShift(id: string, shift: Partial<CashShift>): Promise<CashShift> {
  try {
    const response = await fetch(`/api/accounting/cash-shifts/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(shift),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<CashShift> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при оновленні касової зміни');
    }

    return result.data!;
  } catch (error) {
    console.error('Error updating cash shift:', error);
    throw error;
  }
}

export async function deleteCashShift(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/accounting/cash-shifts/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<void> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при видаленні касової зміни');
    }
  } catch (error) {
    console.error('Error deleting cash shift:', error);
    throw error;
  }
}

// ============ SALARY API ============

export async function getSalaries(filters?: {
  status?: string;
}): Promise<SalaryRow[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`/api/accounting/salary${query}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<SalaryRow[]> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при отриманні зарплати');
    }

    return result.data || [];
  } catch (error) {
    console.error('Error fetching salaries:', error);
    throw error;
  }
}

export async function createSalary(salary: Omit<SalaryRow, 'id'>): Promise<SalaryRow> {
  try {
    const response = await fetch('/api/accounting/salary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(salary),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<SalaryRow> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при створенні запису зарплати');
    }

    return result.data!;
  } catch (error) {
    console.error('Error creating salary:', error);
    throw error;
  }
}

export async function updateSalary(id: string, salary: Partial<SalaryRow>): Promise<SalaryRow> {
  try {
    const response = await fetch(`/api/accounting/salary/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(salary),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<SalaryRow> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при оновленні запису зарплати');
    }

    return result.data!;
  } catch (error) {
    console.error('Error updating salary:', error);
    throw error;
  }
}

export async function deleteSalary(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/accounting/salary/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<void> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Помилка при видаленні запису зарплати');
    }
  } catch (error) {
    console.error('Error deleting salary:', error);
    throw error;
  }
}
