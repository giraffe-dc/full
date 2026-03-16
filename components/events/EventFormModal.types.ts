// Типи даних для форми подій

import { EventType, EventStatus, PaymentStatus } from '@/types/events';

// ============================================
// Component Props
// ============================================

export interface EventFormModalProps {
  event?: any | null;
  onClose: () => void;
  onSubmit: () => void;
}

// ============================================
// Form Data
// ============================================

export interface EventFormData {
  title: string;
  eventType: EventType;
  status: EventStatus;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  childGuests: number;
  adultGuests: number;
  packageId?: string;
  packageName: string;
  basePrice: number;
  additionalServicesTotal: number;
  extraGuestsTotal: number;
  subtotal: number;
  discount: number;
  discountReason?: string;
  total: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  internalNotes?: string;
  clientNotes?: string;
  childBirthday?: string;
}

// ============================================
// Products
// ============================================

export interface SelectedProduct {
  productId: string;
  name: string;
  categoryId?: string;
  quantity: number;
  price: number;
}

export interface Product {
  _id: string;
  id: string;
  name: string;
  category: string;
  sellingPrice: number;
  code: string;
  status: string;
}

export interface Recipe {
  _id: string;
  id: string;
  name: string;
  category: string;
  sellingPrice: number;
  code: string;
  status: string;
}

export type ProductFilter = 'all' | 'products' | 'recipes';

export interface FilteredProduct extends Product {
  type: 'product' | 'recipe';
  uniqueId: string;
}

// ============================================
// Form State
// ============================================

export interface FormErrors {
  title?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  department?: string;
  table?: string;
  clientName?: string;
  clientPhone?: string;
  [key: string]: string | undefined;
}

export interface EventFormState {
  formData: EventFormData;
  loading: boolean;
  errors: FormErrors;
  selectedDepartment: string;
  selectedTable: string;
  existingCheckId: string | null;
}

// ============================================
// Departments & Tables
// ============================================

export interface Department {
  id: string;
  name: string;
  status: string;
}

export interface Table {
  id: string;
  name: string;
  status: 'free' | 'busy' | 'reserved';
  departmentId: string;
}

// ============================================
// Check
// ============================================

export interface CheckItem {
  serviceId: string;
  productId: string;
  serviceName: string;
  category: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface CheckData {
  tableId: string;
  tableName: string;
  departmentId: string;
  shiftId: string | null;
  guestsCount: number;
  waiterId: string | null;
  waiterName: string;
  items: CheckItem[];
  subtotal: number;
  tax: number;
  total: number;
  comment?: string;
  notes?: string;
}

// ============================================
// Handlers
// ============================================

export interface UseEventFormProps {
  event?: any | null;
  selectedDepartment: string;
  selectedTable: string;
  selectedProducts: SelectedProduct[];
  onSubmitSuccess: () => void;
  onClose: () => void;
}

export interface UseEventFormReturn {
  formData: EventFormData;
  loading: boolean;
  errors: FormErrors;
  
  updateField: (field: keyof EventFormData, value: any) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  resetForm: () => void;
  checkSync: {
    existingCheck: any | null;
    fetchCheck: (tableId: string) => Promise<void>;
  };
  
  durationDisplay: {
    hours: number;
    minutes: number;
    formatted: string;
  };
}

export interface UseEventProductsReturn {
  products: Product[];
  recipes: Recipe[];
  selectedProducts: SelectedProduct[];
  searchQuery: string;
  filter: ProductFilter;
  filteredProducts: FilteredProduct[];
  
  toggleProduct: (product: Product | Recipe) => void;
  updateQuantity: (index: number, quantity: number) => void;
  removeProduct: (index: number) => void;
  setSearchQuery: (query: string) => void;
  setFilter: (filter: ProductFilter) => void;
  
  total: number;
  itemsCount: number;
}

export interface UseCheckSyncReturn {
  existingCheck: any | null;
  isSyncing: boolean;
  
  fetchCheck: (tableId: string) => Promise<void>;
  createCheck: (data: CheckData) => Promise<boolean>;
  updateCheck: (checkId: string, data: CheckData) => Promise<boolean>;
  syncFromCheck: (check: any) => void;
}
