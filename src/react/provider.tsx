'use client'

import { useMemo, useState, useCallback, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { WhaleClient } from '../client.js'
import type { WhaleStorefrontConfig, Product } from '../types.js'
import type { PixelManager } from '../pixels/pixel-manager.js'
import { WhaleContext, type WhaleContextValue } from './context.js'
import { createCartStore } from './stores/cart-store.js'
import { createAuthStore } from './stores/auth-store.js'
import { AnalyticsTracker } from './components/analytics-tracker.js'
import { CartInitializer } from './components/cart-initializer.js'
import { AuthInitializer } from './components/auth-initializer.js'
import { PixelInitializer } from './components/pixel-initializer.js'

/** Read a boolean env var (NEXT_PUBLIC_*). Returns undefined when absent. */
function envBool(name: string): boolean | undefined {
  if (typeof process === 'undefined') return undefined
  const raw = (process.env as Record<string, string | undefined>)[name]
  if (raw === undefined || raw === '') return undefined
  return raw !== '0' && raw.toLowerCase() !== 'false'
}

/** Read a numeric env var (NEXT_PUBLIC_*). Returns undefined when absent. */
function envNumber(name: string): number | undefined {
  if (typeof process === 'undefined') return undefined
  const raw = (process.env as Record<string, string | undefined>)[name]
  if (raw === undefined || raw === '') return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

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
  trackingEnabled,
  recordingRate,
}: WhaleProviderProps) {
  const pathname = usePathname()
  const [pixelManager, setPixelManager] = useState<PixelManager | null>(null)

  const handlePixelReady = useCallback((manager: PixelManager) => {
    setPixelManager(manager)
  }, [])

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
      trackingEnabled: trackingEnabled ?? envBool('NEXT_PUBLIC_TRACKING_ENABLED') ?? true,
      recordingRate: recordingRate ?? envNumber('NEXT_PUBLIC_RECORDING_RATE') ?? 0.1,
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
      pixelManager: null,
    }
    // Only recreate when identity changes — storeId + apiKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, apiKey])

  // Update products and pixelManager on the context when they change
  const value = useMemo<WhaleContextValue>(
    () => ({ ...ctx, products, pixelManager }),
    [ctx, products, pixelManager]
  )

  return (
    <WhaleContext.Provider value={value}>
      <AuthInitializer />
      <CartInitializer />
      <AnalyticsTracker pathname={pathname} />
      <PixelInitializer onReady={handlePixelReady} />
      {children}
    </WhaleContext.Provider>
  )
}
