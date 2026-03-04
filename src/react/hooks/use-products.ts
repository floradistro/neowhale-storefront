'use client'

import { useContext, useState, useEffect, useMemo } from 'react'
import { WhaleContext } from '../context.js'
import type { Product } from '../../types.js'

/**
 * Returns products passed via WhaleProvider.
 * Optionally filters by category or search.
 */
export function useProducts(opts?: {
  categoryId?: string
  search?: string
}) {
  const ctx = useContext(WhaleContext)
  if (!ctx) throw new Error('useProducts must be used within <WhaleProvider>')

  const allProducts = ctx.products

  const products = useMemo(() => {
    let result = allProducts
    if (opts?.categoryId) {
      result = result.filter((p) => p.primary_category_id === opts.categoryId)
    }
    if (opts?.search) {
      const q = opts.search.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q)
      )
    }
    return result
  }, [allProducts, opts?.categoryId, opts?.search])

  return {
    products,
    allProducts,
    loading: false,
  }
}

/**
 * Returns a single product by slug from the provider's product list.
 */
export function useProduct(slug: string | null | undefined) {
  const ctx = useContext(WhaleContext)
  if (!ctx) throw new Error('useProduct must be used within <WhaleProvider>')

  const product = useMemo(() => {
    if (!slug) return null
    return ctx.products.find((p) => p.slug === slug) ?? null
  }, [ctx.products, slug])

  return {
    product,
    loading: false,
  }
}
