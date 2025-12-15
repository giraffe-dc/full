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
}

// Чек
export interface Receipt {
  id: string;
  receiptNumber: number;
  customerId?: string;
  customerName?: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'mixed';
  createdAt: string;
  shiftId: string;
  notes?: string;
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
  totalSales: number;
  totalExpenses: number;
  status: 'open' | 'closed';
  cashier: string;
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
  salesByCategory: Record<ServiceCategory, number>;
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
