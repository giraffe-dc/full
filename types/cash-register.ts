// Типи даних для системи управління касою

// Послуги та категорії
export type ServiceCategory = 'bowling' | 'billiards' | 'karaoke' | 'games' | 'bar';

export interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  icon?: string;
  code?: string;
  imageUrl?: string;
  _id?: string;
}

// Клієнти
export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  createdAt: string;
  visits: number;
  totalSpent: number;
  lastVisit?: string;
  notes?: string;
}

// Товари в кошику
export interface CartItem {
  serviceId: string; // Unique ID (transaction ID in cart)
  productId?: string; // ID from database
  serviceName: string;
  category: string; // Changed from enum to string to support DB categories
  price: number;
  quantity: number;
  subtotal: number;
  discount?: number; // Discount amount for this item line
  guestId?: string; // For grouping items by guest
  modifiers?: any[]; // Array of modifiers
}

// Чек
export interface Receipt {
  id: string;
  receiptNumber: number;
  customerId?: string;
  customerName?: string;
  waiterId?: string;
  waiterName?: string;
  waiter: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'mixed';
  createdAt: string;
  updatedAt?: string;
  openedAt?: string;
  shiftId: string;
  notes?: string;
  history?: {
    previousDetails: any;
    newDetails: any;
    action: string;
    changedBy?: string;
    date: string;
    previousValue?: any;
    newValue?: any;
  }[];
  paymentDetails?: {
    cash?: number;
    card?: number;
    certificate?: number;
  };
}

export type CashTransactionType = 'income' | 'expense' | 'incasation';

export type CashTransactionCategory = 'Business Expenses' | 'Supplier Payment' | 'Utilities' | 'Other';
// Or as a string for flexibility, but defined constants are better.
// The user specified: "Господарські витрати, оплата поставщикам, комунальні платежі".
// Let's use string for category to be flexible, but we can provide presets.

export interface ShiftTransaction {
  id: string;
  shiftId: string;
  type: CashTransactionType;
  category?: string; // e.g. "Supplier Payment"
  amount: number;
  comment?: string;
  createdAt: string;
  authorId?: string; // Who created it
  authorName?: string;
}

// Касова зміна
export interface CashShift {
  id: string;
  shiftNumber: number;
  startTime: string;
  endTime?: string;
  startBalance: number;
  endBalance?: number;
  receipts: Receipt[];
  transactions: ShiftTransaction[]; // New field
  totalSales: number;
  totalSalesCash: number;
  totalSalesCard: number;
  totalExpenses: number;
  totalIncome: number; // New field
  totalIncasation: number; // New field
  status: 'open' | 'closed';
  cashier: string;
  activeStaffIds?: string[]; // IDs of staff currently on shift
  notes?: string;
}

// X-Звіт (поточна зміна)
export interface XReport {
  shiftId: string;
  shiftNumber: number;
  status: 'open';
  createdAt: string;
  receiptsCount: number;
  totalSales: number;
  currentBalance: number;
  totalSalesCash: number;
  totalSalesCard: number;
  totalIncome: number;
  totalExpenses: number;
  totalIncasation: number;
  salesByCategory: Record<ServiceCategory, number>;
  transactions: ShiftTransaction[];
}

// Z-Звіт (закриття зміни)
export interface ZReport {
  id: string;
  shiftId: string;
  shiftNumber: number;
  status: 'closed';
  startTime: string;
  endTime: string;
  duration: number; // в хвилинах
  startBalance: number;
  endBalance: number;
  receiptsCount: number;
  totalSales: number;
  totalExpenses: number;
  cashDifference: number;
  salesByCategory: Record<ServiceCategory, number>;
  topServices: Array<{
    serviceId: string;
    serviceName: string;
    quantity: number;
    total: number;
  }>;
  createdAt: string;
}

// Аналітика за період
export interface PeriodAnalytics {
  startDate: string;
  cashier: string;
  cashierId?: string;
  endDate: string;
  totalRevenue: number;
  averageCheck: number;
  customersCount: number;
  receiptsCount: number;
  salesByCategory: Record<ServiceCategory, {
    total: number;
    percentage: number;
    count: number;
  }>;
  topServices: Array<{
    serviceId: string;
    serviceName: string;
    quantity: number;
    total: number;
    percentage: number;
  }>;
  dailyStats: Array<{
    date: string;
    revenue: number;
    receiptsCount: number;
  }>;
}

// Стан касового реєстру
export interface CashRegisterState {
  currentShift: CashShift | null;
  currentCart: CartItem[];
  customers: Customer[];
  services: Service[];
  receipts: Receipt[];
  shifts: CashShift[];
  zReports: ZReport[];
  lastReceiptNumber: number;
  lastShiftNumber: number;
}

// Departments & Tables
export interface Department {
  id: string; // MongoDB _id
  name: string;
  icon?: string;
  status: 'active' | 'inactive';
}

export interface Table {
  id: string; // MongoDB _id
  departmentId: string;
  name: string;
  seats: number;
  status: 'free' | 'busy' | 'reserved';
  x?: number; // Coordinates for visual layout
  y?: number;
}

export interface Check {
  id: string; // MongoDB _id
  tableId: string;
  tableName: string;
  departmentId: string;
  shiftId: string;
  waiterId?: string;
  waiterName?: string;
  customerId?: string;
  customerName?: string;
  comment?: string;
  guestsCount: number;
  items: CartItem[];
  status: 'open'; // Checks are always open. Once paid, they become Receipts
  subtotal: number;
  discount?: number; // Calculated discount amount
  appliedPromotionId?: string; // ID of the applied promotion
  tax: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}
