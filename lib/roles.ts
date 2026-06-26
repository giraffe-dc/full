export type Role = 'admin' | 'staff' | 'user' | 'client';

export const ROLES: Record<Role, { label: string; description: string }> = {
  admin: { label: 'Адміністратор', description: 'Повний доступ без обмежень' },
  staff: { label: 'Працівник', description: 'Каса, персонал, відвідувачі. Без бухгалтерії та адмінки' },
  user: { label: 'Користувач', description: 'Каса, персонал, відвідувачі. Без бухгалтерії та адмінки' },
  client: { label: 'Клієнт', description: 'Особистий кабінет клієнта' },
};

// Маршрути, закриті для user та staff
export const RESTRICTED_PATHS = [
  '/admin',
  '/accounting',
  '/api/admin',
  '/api/accounting',
];

// API routes які потребують admin
export const ADMIN_ONLY_API = [
  '/api/admin',
  '/api/accounting',
];

// Перевіряє чи роль має доступ до маршруту
export function hasAccess(role: Role, pathname: string): boolean {
  if (role === 'admin') return true;
  if (role === 'client') {
    // client доступний тільки до client routes
    return pathname.startsWith('/api/client') || pathname.startsWith('/client');
  }
  // staff та user — закриті тільки admin/accounting шляхи
  return !RESTRICTED_PATHS.some(p =>
    pathname === p || pathname.startsWith(`${p}/`)
  );
}

// Отримати роль з JWT payload
export function getRoleFromPayload(payload: Record<string, any>): Role {
  const role = payload.role as string;
  if (role === 'admin' || role === 'staff' || role === 'user' || role === 'client') {
    return role;
  }
  return 'user'; // за замовчуванням
}
