'use client'

import { useEffect, useRef } from 'react'
import { useAnalytics } from '../hooks/use-analytics.js'
import { useAuth } from '../hooks/use-auth.js'

/**
 * Auto-tracks page views on pathname change and links customer sessions.
 * Rendered internally by WhaleProvider — storefronts don't need to add this manually.
 */
export function AnalyticsTracker({ pathname }: { pathname: string }) {
  const { trackPageView, linkCustomer } = useAnalytics()
  const { customer } = useAuth()
  const prevPathname = useRef<string | null>(null)
  const linkedCustomerId = useRef<string | null>(null)

  // Track page views on route change
  useEffect(() => {
    if (pathname === prevPathname.current) return
    const referrer = prevPathname.current || (typeof document !== 'undefined' ? document.referrer : '')
    prevPathname.current = pathname
    trackPageView(pathname, referrer || undefined)
  }, [pathname, trackPageView])

  // Link customer session on login
  useEffect(() => {
    if (customer?.id && customer.id !== linkedCustomerId.current) {
      linkedCustomerId.current = customer.id
      linkCustomer(customer.id)
    }
  }, [customer?.id, linkCustomer])

  return null
}
