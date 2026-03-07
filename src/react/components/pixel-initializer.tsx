'use client'

import { useEffect, useRef, useContext } from 'react'
import { WhaleContext } from '../context.js'
import { PixelManager } from '../../pixels/pixel-manager.js'
import type { StorefrontConfig } from '../../pixels/types.js'

/**
 * Fetches storefront pixel config on mount and initializes pixel providers.
 * Sets pixelManager on context so useAnalytics can dispatch events to it.
 * Rendered internally by WhaleProvider — storefronts don't need to add this manually.
 */
export function PixelInitializer({ onReady }: { onReady: (manager: PixelManager) => void }) {
  const ctx = useContext(WhaleContext)
  const initialized = useRef(false)

  useEffect(() => {
    if (!ctx || initialized.current) return
    if (typeof window === 'undefined') return
    if (!ctx.config.trackingEnabled) return
    initialized.current = true

    const { client } = ctx

    client.fetchStorefrontConfig().then(async (config: StorefrontConfig) => {
      if (!config.pixels || config.pixels.length === 0) return

      const manager = new PixelManager(config.pixels)
      await manager.initialize()
      onReady(manager)
    }).catch(() => {
      // Pixel config fetch failed — degrade silently
    })
  }, [ctx, onReady])

  return null
}
