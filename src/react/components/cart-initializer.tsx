'use client'

import { useEffect, useRef } from 'react'
import { useCart } from '../hooks/use-cart.js'

/**
 * Hydrates cart from gateway on mount if a cartId is persisted.
 * Rendered internally by WhaleProvider.
 */
export function CartInitializer() {
  const { cartId, syncCart } = useCart()
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    if (cartId) {
      syncCart().catch(() => {
        // Cart may have expired — that's fine, addItem will auto-recover
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
