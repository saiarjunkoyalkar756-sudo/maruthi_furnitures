import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken, AUTH_COOKIE_NAME } from './lib/auth'

// Protected frontend UI paths
const PROTECTED_UI_PREFIXES = [
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

  // 1. Anti-Bypass Guard (Mitigates CVE-2025-29927 spoofing attempts)
  // If an external client attempts to spoof the internal subrequest header, reject immediately
  if (req.headers.has('x-middleware-subrequest')) {
    const subreqVal = req.headers.get('x-middleware-subrequest')
    if (subreqVal && subreqVal.toLowerCase().includes('middleware')) {
      return new NextResponse(
        JSON.stringify({ error: 'Forbidden: Invalid subrequest header.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  // 2. Ignore Next.js internals, static files, and public images
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico' ||
    pathname === '/app.ico' ||
    pathname === '/logo.jpg' ||
    pathname.startsWith('/uploads/')
  ) {
    return NextResponse.next()
  }

  // 3. Extract and verify session token
  const token =
    req.cookies.get(AUTH_COOKIE_NAME)?.value ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const session = await verifySessionToken(token)

  // 4. Protect API Endpoints (Defense-in-depth: All /api/ routes EXCEPT /api/auth/* require valid session)
  if (pathname.startsWith('/api/')) {
    // Whitelist public auth endpoints (login, logout, OTP)
    if (!pathname.startsWith('/api/auth/')) {
      if (!session) {
        return new NextResponse(
          JSON.stringify({
            success: false,
            error: 'Unauthorized: Valid authentication token required to access this resource.',
          }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': req.nextUrl.origin,
            },
          }
        )
      }
    }
    return NextResponse.next()
  }

  // 5. User is on login page
  if (pathname === '/login') {
    if (session) {
      // Already authenticated -> redirect to dashboard
      const nextUrl = req.nextUrl.clone()
      nextUrl.pathname = '/dashboard'
      return NextResponse.redirect(nextUrl)
    }
    return NextResponse.next()
  }

  // 6. Check if route requires authentication
  const isProtected = PROTECTED_UI_PREFIXES.some(
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

  // 7. Root path redirects to /dashboard if logged in, else /login
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
