'use client'

import { useEffect, useRef, useContext } from 'react'
import { WhaleContext } from '../context.js'
import { useAnalytics } from '../hooks/use-analytics.js'
import { useAuth } from '../hooks/use-auth.js'

/**
 * Auto-tracks page views on pathname change and links customer sessions.
 * Rendered internally by WhaleProvider — storefronts don't need to add this manually.
 *
 * When `config.trackingEnabled` is false the component renders nothing and
 * skips all side-effects — the underlying hook guards individual calls too,
 * but short-circuiting here avoids session creation entirely.
 */
export function AnalyticsTracker({ pathname }: { pathname: string }) {
  const ctx = useContext(WhaleContext)
  const { trackPageView, linkCustomer } = useAnalytics()
  const { customer } = useAuth()
  const prevPathname = useRef<string | null>(null)
  const linkedCustomerId = useRef<string | null>(null)

  const trackingEnabled = ctx?.config.trackingEnabled ?? true

  // Track page views on route change
  useEffect(() => {
    if (!trackingEnabled) return
    if (pathname === prevPathname.current) return
    const referrer = prevPathname.current || (typeof document !== 'undefined' ? document.referrer : '')
    prevPathname.current = pathname
    trackPageView(pathname, referrer || undefined)
  }, [pathname, trackPageView, trackingEnabled])

  // Link customer session on login
  useEffect(() => {
    if (!trackingEnabled) return
    if (customer?.id && customer.id !== linkedCustomerId.current) {
      linkedCustomerId.current = customer.id
      linkCustomer(customer.id)
    }
  }, [customer?.id, linkCustomer, trackingEnabled])

  return null
}
