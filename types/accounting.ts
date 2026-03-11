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
  toMoneyAccountId?: string;
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
  birthday?: string; // ISO date
  telegramChatId?: string;
  telegramOptOut?: boolean;
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

export interface Visit {
  id: string;
  _id?: string;
  date: string;
  serviceName: string;
  childName: string;
  parentName: string;
  childAge: number;
  phone: string;
  duration: string;
  startTime: string;
  endTime: string;
  paymentStatus: 'paid' | 'unpaid';
  amount: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// P&L (Profit & Loss) Types
// ============================================

export type CategoryItem = {
  name: string;
  amount: number;
};

export type DailyPoint = {
  dateKey: string;
  income: number;
  expense: number;
  profit: number;
};

export type PnLData = {
  revenue: { total: number; categories: CategoryItem[] };
  cogs: { 
    total: number; 
    categories: CategoryItem[];
    details?: {
      openingStock?: number;
      purchases?: number;
      closingStock?: number;
      recipeCOGS?: number;
    }
  };
  grossProfit: number;
  opex: { total: number; categories: CategoryItem[] };
  operatingProfit: number;
  netProfit: number;
  taxes?: number;
  ebitda?: number;
  dailyStats: DailyPoint[];
};

export type PnLVariance = {
  revenue: number;
  cogs: number;
  grossProfit: number;
  opex: number;
  operatingProfit: number;
  netProfit: number;
};

export type PnLVariancePercent = {
  revenue: number;
  cogs: number;
  grossProfit: number;
  opex: number;
  operatingProfit: number;
  netProfit: number;
};

export type PnLComparison = {
  currentPeriod: PnLData;
  previousPeriod: PnLData;
  variance: PnLVariance;
  variancePercent: PnLVariancePercent;
};

export type FinancialRatios = {
  grossMarginPercent: number;
  operatingMarginPercent: number;
  netMarginPercent: number;
  ebitdaMarginPercent?: number;
};

export type PnLWithComparison = PnLData & {
  comparison?: PnLComparison;
  financialRatios: FinancialRatios;
  comparisonPeriod?: 'previous' | 'same_last_year' | 'none';
};

// ============================================
// Budget Types
// ============================================

export type BudgetItem = {
  _id?: string;
  id?: string;
  categoryId: string;
  categoryName: string;
  month: string; // YYYY-MM format
  plannedAmount: number;
  actualAmount?: number;
  variance?: number;
  variancePercent?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type BudgetTotals = {
  totalPlanned: number;
  totalActual: number;
  totalVariance: number;
  totalVariancePercent: number;
};

export type BudgetWithTotals = {
  items: BudgetItem[];
  totals: BudgetTotals;
};

export type ComparisonPeriod = 'previous' | 'same_last_year' | 'none';

// ============================================
// Notification Types
// ============================================

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'system';

export type NotificationSource = 'telegram' | 'website' | 'system' | 'api' | 'external';

export type Notification = {
  _id?: string;
  id?: string;
  title: string;
  message: string;
  type: NotificationType;
  source: NotificationSource;
  isRead: boolean;
  externalId?: string; // ID from external system (e.g., Telegram message ID)
  metadata?: Record<string, any>; // Additional data from external source
  createdAt: string;
  readAt?: string;
};

export type NotificationStats = {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
};

// ============================================
// Chat Types (for customer support chat)
// ============================================

export type ChatRole = 'user' | 'operator' | 'system';

export type ChatMode = 'admin' | 'bot' | 'mixed';

export type ChatMessage = {
  role: ChatRole;
  content: string;
  timestamp: string;
  adminName?: string; // For operator messages
};

export type ChatSession = {
  sessionId: string;
  deviceId: string;
  mode: ChatMode;
  createdAt: string;
  updatedAt: string;
  lastPingAt?: string;
  status: 'active' | 'closed' | 'archived';
};

export type ChatLog = {
  _id?: string;
  id?: string;
  sessionId: string;
  deviceId: string;
  mode: ChatMode;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  lastPingAt?: string;
  status: 'active' | 'closed' | 'archived';
};

export type ChatLogResponse = {
  sessionId: string;
  deviceId: string;
  mode: ChatMode;
  updatedAt: string;
  messages: ChatMessage[];
};

export type ChatLogsResponse = {
  total: number;
  logs: ChatLogResponse[];
};
