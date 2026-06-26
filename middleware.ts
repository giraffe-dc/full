import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { RESTRICTED_PATHS, RESTRICTED_API_PATHS, type Role } from './lib/roles';

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Skip static assets, public files, and public auth endpoints
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname === '/favicon.ico' ||
    pathname.includes('.') ||
    pathname.startsWith('/api/auth/')
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get('token')?.value;

  // 2. Public route login redirection
  if (pathname === '/login') {
    if (token) {
      try {
        const secret = new TextEncoder().encode(JWT_SECRET);
        await jwtVerify(token, secret);
        const url = req.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
      } catch (err) {
        return NextResponse.next();
      }
    }
    return NextResponse.next();
  }

  // 3. Check authentication
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const role = (payload.role as string) as Role;

    // 4. Role-Based Access Control (RBAC)
    if (role !== 'admin') {
      // client — тільки client routes
      if (role === 'client') {
        const isClientRoute = pathname.startsWith('/api/client') || pathname.startsWith('/client');
        if (!isClientRoute) {
          if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
          }
          const url = req.nextUrl.clone();
          url.pathname = '/';
          return NextResponse.redirect(url);
        }
      }

      // user, staff — перевіряємо обмеження
      if (role === 'user' || role === 'staff') {
        // Перевірка сторінок (/admin, /accounting)
        const isRestrictedPage = RESTRICTED_PATHS.some(p =>
          pathname === p || pathname.startsWith(`${p}/`)
        );
        if (isRestrictedPage) {
          const url = req.nextUrl.clone();
          url.pathname = '/';
          return NextResponse.redirect(url);
        }

        // Перевірка API маршрутів
        if (pathname.startsWith('/api/')) {
          const isRestrictedApi = RESTRICTED_API_PATHS.some(p =>
            pathname.startsWith(p)
          );
          if (isRestrictedApi) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
          }
        }
      }
    }
  } catch (err) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and favicon.
     * Matches pages and api routes.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
