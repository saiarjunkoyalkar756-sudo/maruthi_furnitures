import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken, AUTH_COOKIE_NAME } from './lib/auth'

// Protected route paths
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/billing',
  '/products',
  '/customers',
  '/expenses',
  '/reports',
  '/offers',
  '/settings',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Ignore Next.js internals, static files, and public images
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value
  const session = await verifySessionToken(token)

  // 1. User is on login page
  if (pathname === '/login') {
    if (session) {
      // Already authenticated -> redirect to dashboard
      const nextUrl = req.nextUrl.clone()
      nextUrl.pathname = '/dashboard'
      return NextResponse.redirect(nextUrl)
    }
    return NextResponse.next()
  }

  // 2. Check if route requires authentication
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )

  if (isProtected) {
    if (!session) {
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // 3. Root path redirects to /dashboard if logged in, else /login
  if (pathname === '/') {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = session ? '/dashboard' : '/login'
    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - uploads (uploaded files)
     */
    '/((?!_next/static|_next/image|favicon.ico|uploads/).*)',
  ],
}
