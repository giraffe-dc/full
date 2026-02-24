import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

// Paths that require authentication
const protectedPaths = ['/admin', '/accounting', '/docs', '/projects', '/staff', '/cash-register', '/supply', '/visits'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // only run for protected paths
  if (protectedPaths.some((p) => pathname.startsWith(p))) {
    const token = req.cookies.get('token')?.value;

    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    try {
      // Verify JWT using jose (Edge-compatible)
      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);
      const role = payload.role as string;

      // Access Control Logic
      if (role === 'user') {
        // Allowed paths for 'user' role
        const allowedPaths = ['/', '/cash-register', '/projects', '/docs', '/supply', '/staff', '/visits'];

        const isAllowed = allowedPaths.some(p =>
          pathname === p || pathname.startsWith(`${p}/`)
        );

        // Special case: Home page '/' is not in protectedPaths usually, but if we are here
        // it means we hit a protected path. 'user' should not access /accounting or /staff.

        if (!isAllowed) {
          // User is trying to access restricted area
          const url = req.nextUrl.clone();
          url.pathname = '/'; // Redirect to home
          return NextResponse.redirect(url);
        }
      }

    } catch (err) {
      // Token invalid or verification failed
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/accounting/:path*',
    '/docs/:path*',
    '/projects/:path*',
    '/staff/:path*',
    '/cash-register/:path*',
    '/supply/:path*'
  ],
};
