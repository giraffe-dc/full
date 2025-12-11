# Giraffe — Management system scaffold

Giraffe — management system scaffold for a family entertainment center.

Local setup

1. Create `.env.local` in project root with:

```
MONGODB_URI="your-mongodb-connection-string"
JWT_SECRET="a-strong-secret"
```

2. Install dependencies and run dev server:

```bash
npm install
npm run dev
```

What is included

- MongoDB helper (`lib/mongodb.ts`) with connection caching
- Auth API: `/api/auth/register`, `/api/auth/login`, `/api/auth/me` (JWT in HttpOnly cookie)
- Admin users API: `/api/admin/users` (admin-only)
- Documents API: `/api/docs` and a simple contentEditable editor (`components/DocsEditor.tsx`)
- Accounting transactions API: `/api/accounting/transactions` and UI at `/accounting`

Next steps

- Replace simple editor with TipTap/Quill for better UX
- Harden auth (refresh tokens, password policies)
- Add migrations/seed script to create initial admin user
 - Seed script: `node scripts/seed-admin.js` will create an admin user. Set `MONGODB_URI`, optionally `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.
 - Editor: replaced simple contentEditable with `react-quill` (client-side). Install deps via `npm install`.
 - Middleware: `middleware.ts` redirects unauthenticated requests to `/login` for protected routes (`/admin`, `/accounting`, `/docs`). Server-side routes still perform role checks for admin-only APIs.
