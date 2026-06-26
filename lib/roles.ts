export type Role = 'admin' | 'staff' | 'user' | 'client';

export const ROLES: Record<Role, { label: string; description: string }> = {
  admin: { label: 'Адміністратор', description: 'Повний доступ без обмежень' },
  staff: { label: 'Працівник', description: 'Каса, персонал, відвідувачі. Без бухгалтерії та адмінки' },
  user: { label: 'Користувач', description: 'Каса, персонал, відвідувачі. Без бухгалтерії та адмінки' },
  client: { label: 'Клієнт', description: 'Особистий кабінет клієнта' },
};

// Маршрути, закриті для user та staff (сторінки)
export const RESTRICTED_PATHS = [
  '/admin',
  '/accounting',
];

// API routes, закриті для user та staff
// Виключаємо ті маршрути, які потрібні для каси (products, recipes, clients, categories)
// Також виключаємо /api/admin/chat-proxy — потрібен для каси
export const RESTRICTED_API_PATHS = [
  '/api/admin/users',
  '/api/accounting/accounts',
  '/api/accounting/budgets',
  '/api/accounting/cash-shifts',
  '/api/accounting/checks',
  '/api/accounting/import',
  '/api/accounting/payments',
  '/api/accounting/pnl',
  '/api/accounting/receipts',
  '/api/accounting/salary',
  '/api/accounting/staff',
  '/api/accounting/stock',
  '/api/accounting/transactions',
];

// API routes, ДОПУСКНІ для user та staff (потрібні для каси)
export const POS_ALLOWED_API_PATHS = [
  '/api/accounting/products',
  '/api/accounting/recipes',
  '/api/accounting/clients',
  '/api/accounting/categories',
  '/api/accounting/ingredients',
];

// Перевіряє чи роль має доступ до маршруту
export function hasAccess(role: Role, pathname: string): boolean {
  if (role === 'admin') return true;
  if (role === 'client') {
    return pathname.startsWith('/api/client') || pathname.startsWith('/client');
  }
  // staff та user — перевіряємо обмеження
  const isRestrictedPage = RESTRICTED_PATHS.some(p =>
    pathname === p || pathname.startsWith(`${p}/`)
  );
  if (isRestrictedPage) return false;

  const isRestrictedApi = RESTRICTED_API_PATHS.some(p =>
    pathname.startsWith(p)
  );
  if (isRestrictedApi) return false;

  return true;
}

// Отримати роль з JWT payload
export function getRoleFromPayload(payload: Record<string, any>): Role {
  const role = payload.role as string;
  if (role === 'admin' || role === 'staff' || role === 'user' || role === 'client') {
    return role;
  }
  return 'user';
}
