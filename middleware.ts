import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request)

  // Public routes that don't require authentication
  // /terms and /privacy must be reachable while signed out: the sign-up form
  // links to them, and a consent flow you cannot read before consenting is
  // not consent.
  const publicRoutes = [
    '/',
    '/terms',
    '/privacy',
    '/auth/login',
    '/auth/sign-up',
    '/auth/sign-up-success',
    '/auth/error',
    '/auth/callback',
  ]
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname === route)

  // If user is not authenticated and trying to access protected route
  if (!user && !isPublicRoute) {
    const redirectUrl = new URL('/auth/login', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is authenticated and trying to access auth routes
  if (user && (request.nextUrl.pathname.startsWith('/auth/') && request.nextUrl.pathname !== '/auth/callback')) {
    const redirectUrl = new URL('/discover', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
