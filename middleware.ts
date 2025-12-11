import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that require authentication
const protectedPaths = ['/admin', '/accounting', '/docs', '/projects', '/staff'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // only run for protected paths
  if (protectedPaths.some((p) => pathname.startsWith(p))) {
    const token = req.cookies.get('token')?.value ?? null;
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/accounting/:path*', '/docs/:path*', '/projects/:path*', '/staff/:path*'],
};
