'use client'

import { useContext } from 'react'
import { useStore } from 'zustand'
import { WhaleContext } from '../context.js'
import type { CartState, CartActions } from '../stores/cart-store.js'

type CartReturn = Pick<
  CartState & CartActions,
  'cartId' | 'cartOpen' | 'cartLoading' | 'items' | 'itemCount' | 'subtotal' | 'taxAmount' | 'total' | 'taxBreakdown' | 'productImages' |
  'addItem' | 'removeItem' | 'updateQuantity' | 'toggleCart' | 'openCart' | 'closeCart' | 'checkout' | 'initCart' | 'syncCart' | 'clearCart'
>

export function useCart() {
  const ctx = useContext(WhaleContext)
  if (!ctx) throw new Error('useCart must be used within <WhaleProvider>')

  return useStore(ctx.cartStore, (s) => ({
    cartId: s.cartId,
    items: s.items,
    itemCount: s.itemCount,
    subtotal: s.subtotal,
    taxAmount: s.taxAmount,
    total: s.total,
    taxBreakdown: s.taxBreakdown,
    cartOpen: s.cartOpen,
    cartLoading: s.cartLoading,
    productImages: s.productImages,
    addItem: s.addItem,
    removeItem: s.removeItem,
    updateQuantity: s.updateQuantity,
    toggleCart: s.toggleCart,
    openCart: s.openCart,
    closeCart: s.closeCart,
    initCart: s.initCart,
    syncCart: s.syncCart,
    clearCart: s.clearCart,
    checkout: s.checkout,
  }))
}

/** Granular selector — only re-renders on count change */
export function useCartItemCount(): number {
  const ctx = useContext(WhaleContext)
  if (!ctx) throw new Error('useCartItemCount must be used within <WhaleProvider>')
  return useStore(ctx.cartStore, (s) => s.itemCount)
}

/** Granular selector — only re-renders on total change */
export function useCartTotal(): number {
  const ctx = useContext(WhaleContext)
  if (!ctx) throw new Error('useCartTotal must be used within <WhaleProvider>')
  return useStore(ctx.cartStore, (s) => s.total)
}
