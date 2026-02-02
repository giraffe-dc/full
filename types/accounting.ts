// Типи даних для модуля Бухгалтерія

export type Transaction = {
  id: any;
  _id: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  category?: string;
  paymentMethod?: string;
  source?: string;
  visits?: number;
  createdAt: string;
  moneyAccountId?: string;
};

export type Totals = {
  income: number;
  expense: number;
  balance: number;
};

export type ClientRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  noDiscount: number;
  cash: number;
  card: number;
  profit: number;
  receipts: number;
  avgCheck: number;
  status: 'active' | 'inactive';
};

export type ClientsTotals = {
  noDiscount: number;
  cash: number;
  card: number;
  profit: number;
  receipts: number;
};

export type StaffRow = {
  id: string;
  name: string;
  position: string;
  revenue: number;
  profit: number;
  receipts: number;
  avgCheck: number;
  avgTime: string;
  workedTime: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive';
  salary: number;
};

export type StaffTotals = {
  revenue: number;
  profit: number;
  receipts: number;
};

export type CategoryRow = {
  name: string;
  count: number;
  cost: number;
  revenue: number;
  tax: number;
  profit: number;
  foodCostPercent: number;
};

export type CategoryTotals = {
  count: number;
  cost: number;
  revenue: number;
  tax: number;
  profit: number;
};

export type ProductRow = {
  name: string;
  modifier: string;
  count: number;
  grossRevenue: number;
  discount: number;
  revenue: number;
  profit: number;
};

export type ProductTotals = {
  count: number;
  grossRevenue: number;
  discount: number;
  revenue: number;
  profit: number;
};

export type PaymentRow = {
  id: string;
  method: string;
  amount: number;
  date: string;
  receiptsCount: number;
  cash: number;
  card: number;
  total: number;
  status: 'completed' | 'pending' | 'overdue';
};

export type PaymentTotals = {
  receiptsCount: number;
  cash: number;
  card: number;
  total: number;
};

export type ReceiptRow = {
  id: string;
  risk: string;
  waiter: string;
  openedAt: string;
  closedAt: string;
  paid: number;
  discount: number;
  profit: number;
  status: string;
};

export type CashShift = {
  id: string;
  date: string;
  cashier: string;
  cash: number;
  cashless: number;
  difference: number;
  status: 'opened' | 'closed';
  register: string;
  openedAt: string;
  closedAt: string;
  openingBalance: number;
  closingBalance: number;
};

export type SalaryRow = {
  id: string;
  employee: string;
  position: string;
  salary: number;
  bonus: number;
  fine: number;
  toPay: number;
  status: 'paid' | 'pending' | 'overdue';
};

export type CategoryLabel = Record<string, string>;

export type InvoiceRow = {
  id: string;
  name: string;
  type: string;
  balance: number;
  status: 'active' | 'inactive';
};

export type MenuProduct = {
  id: string;
  _id?: string; // Optional MongoDB ID
  code: string;
  name: string;
  category: string;
  costPerUnit: number;
  sellingPrice: number;
  markup: number;
  status: 'active' | 'inactive';
};

export type RecipeIngredient = {
  id: string;
  name: string;
  quantity: number; // Gross weight/quantity (default view)
  gross: number; // New field for Gross weight
  net: number; // New field for Net weight
  method: string; // New field from design: "Спосіб приготування"
  unit: string;
  costPerUnit: number; // Cost per unit of the ingredient
  totalCost: number; // Total cost for this ingredient entry
};

export type MenuRecipe = {
  id: string;
  _id?: string; // Optional MongoDB ID
  code: string;
  name: string;
  category: string;
  cookingStation: string; // New field: "Цех приготування"
  yield: number;
  yieldUnit: string;
  costPerUnit: number;
  sellingPrice: number;
  markup: number;
  ingredients: RecipeIngredient[];
  notes: string;
  lastModified: string;
  modifiedBy: string;
  status: 'active' | 'inactive';
};

export type ProductCategory = {
  id: string;
  name: string;
  parentCategory?: string;
  image?: string;
  description?: string;
  status: 'active' | 'inactive';
  createdAt: string;
};

export type MenuIngredient = {
  id: string;
  _id?: string; // Optional MongoDB ID
  code: string;
  name: string;
  category: string;
  unit: string;
  costPerUnit: number;
  status: 'active' | 'inactive';
};

export type MoneyAccount = {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  description: string;
  status: 'active' | 'inactive';
  createdAt?: string;
  initialBalance?: number;
  periodIncome?: number;
  periodExpense?: number;
};

export type ExpenseCategory = {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  color?: string;
  status: 'active' | 'inactive';
  createdAt?: string;
};
