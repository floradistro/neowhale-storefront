/**
 * Gateway rewrite rule for Next.js.
 * Proxies client-side /api/gw/* requests to whale-gateway to avoid CORS.
 *
 * Usage in next.config.ts:
 * ```ts
 * import { whaleGatewayRewrite } from '@neowhale/storefront/next'
 * export default {
 *   async rewrites() {
 *     return [whaleGatewayRewrite()]
 *   }
 * }
 * ```
 */
export function whaleGatewayRewrite(
  gatewayUrl = 'https://whale-gateway.fly.dev',
  proxyPath = '/api/gw'
): { source: string; destination: string } {
  return {
    source: `${proxyPath}/:path*`,
    destination: `${gatewayUrl}/:path*`,
  }
}
