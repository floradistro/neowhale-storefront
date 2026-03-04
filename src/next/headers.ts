/**
 * Security headers for Next.js storefronts.
 */

export const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
  },
]

/**
 * Returns a Next.js `headers()` config with security headers applied to all routes.
 * Use in next.config.ts:
 *
 * ```ts
 * import { withSecurityHeaders } from '@neowhale/storefront/next'
 * export default { headers: withSecurityHeaders() }
 * ```
 */
export function withSecurityHeaders(
  extra?: { key: string; value: string }[]
): () => Promise<{ source: string; headers: { key: string; value: string }[] }[]> {
  const allHeaders = extra ? [...securityHeaders, ...extra] : securityHeaders
  return async () => [
    {
      source: '/:path*',
      headers: allHeaders,
    },
  ]
}
