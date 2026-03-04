import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Creates a Next.js middleware that protects routes requiring authentication.
 *
 * Checks for a session token cookie or localStorage indicator.
 * Since middleware runs on the edge and can't access localStorage,
 * this checks for a cookie-based token instead.
 *
 * Usage in middleware.ts:
 * ```ts
 * import { createAuthMiddleware } from '@neowhale/storefront/next'
 * export const middleware = createAuthMiddleware({
 *   protectedPaths: ['/account'],
 *   loginPath: '/account',
 * })
 * export const config = { matcher: ['/account/:path*'] }
 * ```
 */
export function createAuthMiddleware(options: {
  protectedPaths: string[]
  loginPath: string
  cookieName?: string
}) {
  const { protectedPaths, loginPath, cookieName = 'whale-session' } = options

  return function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Check if this is a protected path
    const isProtected = protectedPaths.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    )

    if (!isProtected) {
      return NextResponse.next()
    }

    // Check for session cookie
    const token = request.cookies.get(cookieName)?.value

    if (!token) {
      const url = request.nextUrl.clone()
      url.pathname = loginPath
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    return NextResponse.next()
  }
}
