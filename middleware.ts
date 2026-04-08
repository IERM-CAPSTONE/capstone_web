import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from "next/server";

const intlMiddleware = createMiddleware({
  locales: ['en', 'vi'],
  defaultLocale: 'vi',
  localePrefix: 'always',
  localeDetection: false,
});

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Auth logic FIRST
  const token =
    request.cookies.get("access_token")?.value ||
    request.cookies.get("refresh_token")?.value ||
    request.cookies.get("token")?.value;

  const publicRoutes = ["/auth/login", "/register", "/forgot-password", "/auth/callback"];
  const pathnameWithoutLocale = pathname.replace(/^\/(en|vi)/, "") || "/";

  const isPublicRoute =
    publicRoutes.includes(pathnameWithoutLocale) ||
    publicRoutes.some((route) => pathnameWithoutLocale.startsWith(route));

  // If accessing a protected route without token, redirect to login
  if (!isPublicRoute && !token && pathnameWithoutLocale !== "/") {
    const locale = pathname.startsWith('/en') ? 'en' : 'vi';
    // Manually construct the login URL with locale
    const loginUrl = new URL(`/${locale}/auth/login`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 2. If auth is okay, let intl handle everything else
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
