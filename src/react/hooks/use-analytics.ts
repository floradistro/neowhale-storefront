'use client'

import { useContext, useRef, useCallback } from 'react'
import { WhaleContext } from '../context.js'
import type { EventType } from '../../types.js'

const SESSION_KEY_SUFFIX = '-analytics-session'

interface SessionData {
  id: string
  createdAt: number
}

export function useAnalytics() {
  const ctx = useContext(WhaleContext)
  if (!ctx) throw new Error('useAnalytics must be used within <WhaleProvider>')

  const { client, config } = ctx
  const sessionPromiseRef = useRef<Promise<string> | null>(null)
  const sessionKey = `${config.storagePrefix}${SESSION_KEY_SUFFIX}`

  const getOrCreateSession = useCallback(async (): Promise<string> => {
    if (sessionPromiseRef.current) return sessionPromiseRef.current

    sessionPromiseRef.current = (async () => {
      // Check stored session
      try {
        const raw = localStorage.getItem(sessionKey)
        if (raw) {
          const stored: SessionData = JSON.parse(raw)
          if (Date.now() - stored.createdAt < config.sessionTtl) {
            // Refresh last_active silently
            client.updateSession(stored.id, { last_active_at: new Date().toISOString() }).catch(() => {})
            return stored.id
          }
        }
      } catch {
        // ignore
      }

      // Create new
      try {
        const session = await client.createSession({
          user_agent: navigator.userAgent,
          referrer: document.referrer || undefined,
        })
        if (session?.id) {
          localStorage.setItem(sessionKey, JSON.stringify({ id: session.id, createdAt: Date.now() }))
          return session.id
        }
      } catch {
        // ignore
      }

      // Fallback local ID
      const fallbackId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      localStorage.setItem(sessionKey, JSON.stringify({ id: fallbackId, createdAt: Date.now() }))
      return fallbackId
    })()

    sessionPromiseRef.current.finally(() => {
      sessionPromiseRef.current = null
    })

    return sessionPromiseRef.current
  }, [client, config.sessionTtl, sessionKey])

  const track = useCallback(
    async (eventType: EventType, data: Record<string, unknown> = {}) => {
      try {
        const sessionId = await getOrCreateSession()
        await client.trackEvent({ session_id: sessionId, event_type: eventType, event_data: data })
      } catch {
        // fire-and-forget
      }
    },
    [client, getOrCreateSession]
  )

  const linkCustomer = useCallback(
    async (customerId: string) => {
      try {
        const sessionId = await getOrCreateSession()
        if (sessionId.startsWith('local-')) return
        await client.updateSession(sessionId, { customer_id: customerId })
      } catch {
        // ignore
      }
    },
    [client, getOrCreateSession]
  )

  const trackPageView = useCallback(
    (url: string, referrer?: string) => {
      track('page_view', { url, referrer })
    },
    [track]
  )

  const trackProductView = useCallback(
    (productId: string, productName: string, category: string, price?: number) => {
      track('product_view', { product_id: productId, product_name: productName, category, price })
    },
    [track]
  )

  const trackCategoryView = useCallback(
    (categoryId: string, categoryName: string) => {
      track('category_view', { category_id: categoryId, category_name: categoryName })
    },
    [track]
  )

  const trackSearch = useCallback(
    (query: string, resultCount?: number) => {
      track('search', { query, result_count: resultCount })
    },
    [track]
  )

  const trackBeginCheckout = useCallback(
    (cartId: string, total: number, itemCount: number) => {
      track('begin_checkout', { cart_id: cartId, total, item_count: itemCount })
    },
    [track]
  )

  const trackPurchase = useCallback(
    (orderId: string, orderNumber: string, total: number) => {
      track('purchase', { order_id: orderId, order_number: orderNumber, total })
    },
    [track]
  )

  const trackAddToCart = useCallback(
    (productId: string, productName: string, quantity: number, price: number, tier?: string) => {
      track('add_to_cart', { product_id: productId, product_name: productName, quantity, price, tier })
    },
    [track]
  )

  const trackRemoveFromCart = useCallback(
    (productId: string, productName: string) => {
      track('remove_from_cart', { product_id: productId, product_name: productName })
    },
    [track]
  )

  return {
    track,
    trackPageView,
    trackProductView,
    trackCategoryView,
    trackSearch,
    trackBeginCheckout,
    trackPurchase,
    trackAddToCart,
    trackRemoveFromCart,
    linkCustomer,
    getOrCreateSession,
  }
}
