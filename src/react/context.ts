import { createContext } from 'react'
import type { WhaleClient } from '../client.js'
import type { Product } from '../types.js'
import type { CartStore } from './stores/cart-store.js'
import type { AuthStore } from './stores/auth-store.js'

export interface WhaleContextValue {
  client: WhaleClient
  config: {
    storeId: string
    apiKey: string
    gatewayUrl: string
    proxyPath: string
    mediaSigningSecret: string
    supabaseHost: string
    storagePrefix: string
    sessionTtl: number
    debug: boolean
  }
  cartStore: CartStore
  authStore: AuthStore
  /** Products fetched server-side and passed via provider */
  products: Product[]
}

export const WhaleContext = createContext<WhaleContextValue | null>(null)
