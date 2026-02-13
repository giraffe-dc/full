import {
  ClientRow,
  ClientsTotals,
  StaffRow,
  StaffTotals,
  CategoryRow,
  CategoryTotals,
  ProductRow,
  ProductTotals,
  PaymentRow,
  PaymentTotals,
} from '../types/accounting';

/**
 * Розрахувати загальні суми для клієнтів
 */
export function calculateClientsTotals(rows: ClientRow[]): ClientsTotals {
  return rows.reduce(
    (acc, c) => {
      acc.noDiscount += c.noDiscount;
      acc.cash += c.cash;
      acc.card += c.card;
      acc.profit += c.profit;
      acc.receipts += c.receipts;
      return acc;
    },
    { noDiscount: 0, cash: 0, card: 0, profit: 0, receipts: 0 }
  );
}

/**
 * Розрахувати загальні суми для персоналу
 */
export function calculateStaffTotals(rows: StaffRow[]): StaffTotals {
  return rows.reduce(
    (acc, s) => {
      acc.revenue += s.revenue;
      acc.profit += s.profit;
      acc.receipts += s.receipts;
      return acc;
    },
    { revenue: 0, profit: 0, receipts: 0 }
  );
}

/**
 * Розрахувати загальні суми для категорій
 */
export function calculateCategoryTotals(rows: CategoryRow[]): CategoryTotals {
  return rows.reduce(
    (acc, c) => {
      acc.count += c.count;
      acc.cost += c.cost;
      acc.revenue += c.revenue;
      acc.tax += c.tax;
      acc.profit += c.profit;
      return acc;
    },
    { count: 0, cost: 0, revenue: 0, tax: 0, profit: 0 }
  );
}

/**
 * Розрахувати загальні суми для товарів
 */
export function calculateProductTotals(rows: ProductRow[]): ProductTotals {
  return rows.reduce(
    (acc, p) => {
      acc.count += p.count;
      acc.grossRevenue += p.grossRevenue;
      acc.discount += p.discount;
      acc.revenue += p.revenue;
      acc.profit += p.profit;
      return acc;
    },
    { count: 0, grossRevenue: 0, discount: 0, revenue: 0, profit: 0 }
  );
}

/**
 * Розрахувати загальні суми для платежів
 */
export function calculatePaymentTotals(rows: PaymentRow[]): PaymentTotals {
  return rows.reduce(
    (acc, p) => {
      acc.receiptsCount += p.receiptsCount;
      acc.cash += p.cash;
      acc.card += p.card;
      acc.total += p.total;
      return acc;
    },
    { receiptsCount: 0, cash: 0, card: 0, total: 0 }
  );
}

/**
 * Розрахувати статистику доходів
 */
/**
 * Розрахувати статистику доходів
 */
export function calculateIncomeStats(transactions: any[]) {
  // STRICTLY Sales for "Total Income"
  const incomeTx = transactions.filter((t) =>
    t.type === "income" && t.category === "sales"
  );
  const totalIncomeAmount = incomeTx.reduce((sum, t) => sum + t.amount, 0);
  const averageCheck = incomeTx.length > 0 ? totalIncomeAmount / incomeTx.length : 0;
  // Visits are usually only attached to sales receipts
  const totalVisits = incomeTx.reduce((sum, t) => sum + (t.visits || 0), 0);

  return {
    incomeTx,
    totalIncomeAmount,
    averageCheck,
    totalVisits,
  };
}

/**
 * Розрахувати загальні витрати для дашборду (всі витрати мінус інкасація)
 */
export function calculateDashboardExpenseStats(transactions: any[]) {
  const expenseTx = transactions.filter((t) =>
    t.type === "expense" &&
    t.category !== "incasation" &&
    t.type !== "incasation"
  );

  const totalExpenseAmount = expenseTx.reduce((sum, t) => sum + t.amount, 0);

  return {
    expenseTx,
    totalExpenseAmount
  };
}

/**
 * Розрахувати статистику по категоріях доходів
 */
export function calculateIncomeCategoryStats(transactions: any[]) {
  const incomeTx = transactions.filter((t) => t.type === "income" && t.category !== "incasation" && t.type !== "incasation");
  const stats: Record<string, number> = {};

  incomeTx.forEach((t) => {
    const category = t.category || "other";
    stats[category] = (stats[category] || 0) + t.amount;
  });

  return stats;
}

/**
 * Розрахувати статистику по категоріях витрат
 */
export function calculateExpenseCategoryStats(transactions: any[]) {
  const expenseTx = transactions.filter((t) => t.type === "expense" && t.category !== "incasation" && t.type !== "incasation");
  const stats: Record<string, number> = {};

  expenseTx.forEach((t) => {
    const category = t.category || "other";
    stats[category] = (stats[category] || 0) + t.amount;
  });

  return stats;
}

/**
 * Розрахувати статистику по методах оплати (готівка/картка) для доходів
 */
export function calculatePaymentMethodStats(transactions: any[]) {
  const incomeTx = transactions.filter((t) => t.type === "income" && t.category !== "incasation" && t.type !== "incasation");
  const stats: Record<string, number> = {
    cash: 0,
    card: 0,
    mixed: 0,
    other: 0
  };

  incomeTx.forEach((t) => {
    const method = t.paymentMethod || "other";
    if (method === 'cash') stats.cash += t.amount;
    else if (method === 'card') stats.card += t.amount;
    else if (method === 'mixed') stats.mixed += t.amount;
    else stats.other += t.amount;
  });

  return stats;
}

/**
 * Розрахувати щоденну статистику
 */
export function calculateDailyStats(transactions: any[]) {
  const dailyMap = new Map<string, { income: number; expense: number }>();

  transactions.forEach((t) => {
    // Exclude incasation from daily stats
    if (t.type === 'incasation' || t.category === 'incasation') return;

    const date = new Date(t.date).toISOString().split("T")[0];
    const current = dailyMap.get(date) || { income: 0, expense: 0 };

    if (t.type === "income") {
      current.income += Number(t.amount || 0);
    } else if (t.type === "expense") {
      current.expense += Number(t.amount || 0);
    }

    dailyMap.set(date, current);
  });

  return Array.from(dailyMap.entries())
    .map(([dateKey, { income, expense }]) => ({
      dateKey,
      income,
      expense,
      balance: income - expense,
    }))
    .sort((a, b) => new Date(a.dateKey).getTime() - new Date(b.dateKey).getTime())
    .slice(-10); // останні 10 днів
}

/**
 * Розрахувати максимальне значення для графіка
 */
export function calculateMaxDailyValue(dailyStats: any[]) {
  return Math.max(...dailyStats.map((s) => Math.max(s.income, s.expense)), 0);
}

/**
 * Розрахувати загальні суми (доходи, витрати, баланс)
 */
export function calculateTotals(transactions: any[]) {
  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const expense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    income,
    expense,
    balance: income - expense,
  };
}
