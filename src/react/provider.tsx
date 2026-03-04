'use client'

import { useMemo, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { WhaleClient } from '../client.js'
import type { WhaleStorefrontConfig, Product } from '../types.js'
import { WhaleContext, type WhaleContextValue } from './context.js'
import { createCartStore } from './stores/cart-store.js'
import { createAuthStore } from './stores/auth-store.js'
import { AnalyticsTracker } from './components/analytics-tracker.js'
import { CartInitializer } from './components/cart-initializer.js'
import { AuthInitializer } from './components/auth-initializer.js'

export interface WhaleProviderProps extends WhaleStorefrontConfig {
  children: ReactNode
  /** Server-fetched products passed to client for hooks */
  products?: Product[]
}

export function WhaleProvider({
  children,
  products = [],
  storeId,
  apiKey,
  gatewayUrl,
  proxyPath,
  mediaSigningSecret,
  supabaseHost,
  storagePrefix,
  sessionTtl,
  debug,
}: WhaleProviderProps) {
  const pathname = usePathname()

  const ctx = useMemo<WhaleContextValue>(() => {
    const resolvedConfig = {
      storeId,
      apiKey,
      gatewayUrl: gatewayUrl || 'https://whale-gateway.fly.dev',
      proxyPath: proxyPath || '/api/gw',
      mediaSigningSecret: mediaSigningSecret || '',
      supabaseHost: supabaseHost || '',
      storagePrefix: storagePrefix || 'whale',
      sessionTtl: sessionTtl || 30 * 60 * 1000,
      debug: debug || false,
    }

    const client = new WhaleClient({
      storeId,
      apiKey,
      gatewayUrl: resolvedConfig.gatewayUrl,
      proxyPath: resolvedConfig.proxyPath,
    })

    // Analytics callbacks wired into cart store
    // These get called by the cart store on add/remove and fire analytics events.
    // We can't use the useAnalytics hook here (not in a component), so we use
    // the client directly — the AnalyticsTracker manages sessions.
    const cartStore = createCartStore(client, resolvedConfig.storagePrefix)
    const authStore = createAuthStore(client, resolvedConfig.storagePrefix)

    return {
      client,
      config: resolvedConfig,
      cartStore,
      authStore,
      products,
    }
    // Only recreate when identity changes — storeId + apiKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, apiKey])

  // Update products on the context when they change (e.g. re-fetched)
  const value = useMemo<WhaleContextValue>(
    () => ({ ...ctx, products }),
    [ctx, products]
  )

  return (
    <WhaleContext.Provider value={value}>
      <AuthInitializer />
      <CartInitializer />
      <AnalyticsTracker pathname={pathname} />
      {children}
    </WhaleContext.Provider>
  )
}
