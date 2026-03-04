import { WhaleClient } from '../client.js'
import type { Product, WhaleStorefrontConfig } from '../types.js'

/**
 * Creates a server-side WhaleClient.
 * Reads from env vars by default — override with explicit config.
 */
export function createServerClient(config?: Partial<WhaleStorefrontConfig>): WhaleClient {
  return new WhaleClient({
    storeId: config?.storeId || process.env.NEXT_PUBLIC_STORE_ID || '',
    apiKey: config?.apiKey || process.env.NEXT_PUBLIC_API_KEY || '',
    gatewayUrl: config?.gatewayUrl || process.env.NEXT_PUBLIC_API_URL || 'https://whale-gateway.fly.dev',
    proxyPath: config?.proxyPath,
  })
}

/**
 * Server-side: fetch all published products with ISR caching.
 * Drop-in replacement for Flora's `getAllProducts()`.
 */
export async function getAllProducts(options?: {
  /** Revalidate interval in seconds. Defaults to 60. */
  revalidate?: number
  /** Filter function to exclude products (e.g. hidden categories, out of stock) */
  filter?: (product: Product) => boolean
  /** Override client config */
  client?: WhaleClient
}): Promise<Product[]> {
  const client = options?.client ?? createServerClient()
  return client.getAllProducts({
    status: 'published',
    revalidate: options?.revalidate ?? 60,
    filter: options?.filter,
  })
}
