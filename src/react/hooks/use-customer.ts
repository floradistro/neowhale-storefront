'use client'

import { useContext, useState, useEffect, useCallback } from 'react'
import { useStore } from 'zustand'
import { WhaleContext } from '../context.js'
import type { Order, CustomerAnalytics } from '../../types.js'

export function useCustomerOrders() {
  const ctx = useContext(WhaleContext)
  if (!ctx) throw new Error('useCustomerOrders must be used within <WhaleProvider>')

  const customer = useStore(ctx.authStore, (s) => s.customer)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!customer?.id) {
      setOrders([])
      return
    }
    setLoading(true)
    try {
      const data = await ctx.client.getCustomerOrders(customer.id)
      setOrders(data)
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [customer?.id, ctx.client])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { orders, loading, refresh }
}

export function useCustomerAnalytics() {
  const ctx = useContext(WhaleContext)
  if (!ctx) throw new Error('useCustomerAnalytics must be used within <WhaleProvider>')

  const customer = useStore(ctx.authStore, (s) => s.customer)
  const [analytics, setAnalytics] = useState<CustomerAnalytics | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!customer?.id) {
      setAnalytics(null)
      return
    }
    setLoading(true)
    const name = `${customer.first_name} ${customer.last_name}`.trim()
    ctx.client
      .getCustomerAnalytics(customer.id, name || undefined)
      .then(setAnalytics)
      .catch(() => setAnalytics(null))
      .finally(() => setLoading(false))
  }, [customer?.id, customer?.first_name, customer?.last_name, ctx.client])

  return { analytics, loading }
}
