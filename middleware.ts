import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Skip static assets, public files, and public auth endpoints
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname === '/favicon.ico' ||
    pathname.includes('.') || // matches assets like audio, images, etc.
    pathname.startsWith('/api/auth/') // allow login, register, me, logout
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
        // Valid token, redirect to home page
        const url = req.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
      } catch (err) {
        // Invalid token, allow access to login page
        return NextResponse.next();
      }
    }
    return NextResponse.next();
  }

  // 3. Check authentication for all other pages and API endpoints
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
    const role = payload.role as string;

    // 4. Role-Based Access Control (RBAC)
    if (role === 'user') {
      // User is forbidden from entering admin/accounting areas
      const restrictedPaths = ['/admin', '/accounting', '/api/admin', '/api/accounting'];
      const isRestricted = restrictedPaths.some(p => 
        pathname === p || pathname.startsWith(`${p}/`)
      );

      if (isRestricted) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const url = req.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
      }
    }
  } catch (err) {
    // Verification failed / token invalid
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
