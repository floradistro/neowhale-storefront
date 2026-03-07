import type {
  Cart,
  CartItem,
  Customer,
  CustomerAnalytics,
  ListResponse,
  Location,
  Order,
  PaymentData,
  Product,
  SendCodeResponse,
  StorefrontSession,
  VerifyCodeResponse,
  WhaleStorefrontConfig,
  EventType,
} from './types.js'

import type { StorefrontConfig } from './pixels/types.js'

import {
  fetchAllCustomerOrders,
  findCustomerAnalytics,
  encodeBase64Url,
  signMedia,
} from './client-queries.js'

import { resilientSend } from './resilient-send.js'

// -- WhaleClient --
// Stateless HTTP wrapper around whale-gateway. Works server-side and client-side.
// No React, no browser APIs (except fetch).

export class WhaleClient {
  readonly storeId: string
  readonly apiKey: string
  readonly gatewayUrl: string
  readonly proxyPath: string

  private _sessionToken: string | null = null

  constructor(config: WhaleStorefrontConfig) {
    this.storeId = config.storeId
    this.apiKey = config.apiKey
    this.gatewayUrl = config.gatewayUrl || 'https://whale-gateway.fly.dev'
    this.proxyPath = config.proxyPath || '/api/gw'
  }

  // -- Token Management --

  setSessionToken(token: string | null): void { this._sessionToken = token }
  getSessionToken(): string | null { return this._sessionToken }

  // -- Base URL --

  private get baseUrl(): string {
    return typeof window === 'undefined' ? this.gatewayUrl : this.proxyPath
  }

  // -- Base Fetcher --

  private async request<T = unknown>(
    path: string, options: RequestInit = {}, opts?: { revalidate?: number }
  ): Promise<T> {
    const url = `${this.baseUrl}/v1/stores/${this.storeId}${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
    }
    if (this._sessionToken) headers['Authorization'] = `Bearer ${this._sessionToken}`

    const fetchOptions: RequestInit & { next?: { revalidate?: number } } = {
      ...options,
      headers: { ...headers, ...((options.headers as Record<string, string>) ?? {}) },
    }
    if (opts?.revalidate !== undefined) fetchOptions.next = { revalidate: opts.revalidate }

    const res = await fetch(url, fetchOptions)
    if (!res.ok) {
      let message = `Gateway error ${res.status}: ${res.statusText}`
      try {
        const body = await res.json()
        if (body?.message) message = body.message
        else if (body?.error) message = body.error
      } catch { /* ignore parse errors */ }
      const err = new Error(message) as Error & { status: number }
      err.status = res.status
      throw err
    }
    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
  }

  // -- Products --

  async listProducts(params?: { limit?: number; starting_after?: string; status?: string }): Promise<ListResponse<Product>> {
    const sp = new URLSearchParams()
    if (params?.limit) sp.set('limit', String(params.limit))
    if (params?.starting_after) sp.set('starting_after', params.starting_after)
    if (params?.status) sp.set('status', params.status)
    const qs = sp.toString()
    return this.request<ListResponse<Product>>(`/products${qs ? `?${qs}` : ''}`)
  }

  async getProduct(id: string): Promise<Product> {
    return this.request<Product>(`/products/${id}`)
  }

  async getAllProducts(options?: {
    status?: string; maxPages?: number; revalidate?: number; filter?: (product: Product) => boolean
  }): Promise<Product[]> {
    const all: Product[] = []
    let cursor: string | undefined
    let hasMore = true
    let pages = 0
    const maxPages = options?.maxPages ?? 20

    while (hasMore && pages < maxPages) {
      const params = new URLSearchParams({ limit: '100' })
      if (options?.status) params.set('status', options.status)
      else params.set('status', 'published')
      if (cursor) params.set('starting_after', cursor)

      const data = await this.request<ListResponse<Product>>(
        `/products?${params}`, {},
        options?.revalidate !== undefined ? { revalidate: options.revalidate } : undefined
      )
      if (!data.data || data.data.length === 0) break
      for (const p of data.data) {
        if (!options?.filter || options.filter(p)) all.push(p)
        cursor = p.id
      }
      hasMore = data.has_more
      pages++
    }
    return all
  }

  // -- Cart --

  async createCart(customerEmail?: string): Promise<Cart> {
    return this.request<Cart>('/cart', {
      method: 'POST',
      body: JSON.stringify(customerEmail ? { customer_email: customerEmail } : {}),
    })
  }

  async getCart(cartId: string): Promise<Cart> {
    return this.request<Cart>(`/cart/${cartId}`)
  }

  async addToCart(cartId: string, productId: string, quantity: number, options?: { tier?: string; unitPrice?: number }): Promise<CartItem> {
    return this.request<CartItem>(`/cart/${cartId}/items`, {
      method: 'POST',
      body: JSON.stringify({
        product_id: productId, quantity,
        ...(options?.tier !== undefined && { tier: options.tier }),
        ...(options?.unitPrice !== undefined && { unit_price: options.unitPrice }),
      }),
    })
  }

  async updateCartItem(cartId: string, itemId: string, quantity: number): Promise<Cart> {
    return this.request<Cart>(`/cart/${cartId}/items/${itemId}`, { method: 'PATCH', body: JSON.stringify({ quantity }) })
  }

  async removeCartItem(cartId: string, itemId: string): Promise<void> {
    return this.request<void>(`/cart/${cartId}/items/${itemId}`, { method: 'DELETE' })
  }

  // -- Checkout --

  async checkout(cartId: string, customerEmail?: string, payment?: PaymentData): Promise<Order> {
    return this.request<Order>('/checkout', {
      method: 'POST',
      body: JSON.stringify({
        cart_id: cartId,
        ...(customerEmail && { customer_email: customerEmail }),
        ...(payment && {
          payment_method: payment.payment_method,
          ...(payment.opaque_data && { opaque_data: payment.opaque_data }),
          ...(payment.billTo && { bill_to: payment.billTo }),
          ...(payment.shipTo && { ship_to: payment.shipTo }),
        }),
      }),
    })
  }

  // -- Customers --

  async findCustomer(query: string): Promise<Customer[]> {
    const encoded = encodeURIComponent(query)
    const res = await this.request<{ data: Customer[] } | Customer[]>(`/customers?query=${encoded}`)
    return Array.isArray(res) ? res : res?.data ?? []
  }

  async getCustomer(id: string): Promise<Customer> { return this.request<Customer>(`/customers/${id}`) }

  async createCustomer(data: { first_name: string; last_name: string; email: string; phone?: string }): Promise<Customer> {
    return this.request<Customer>('/customers', { method: 'POST', body: JSON.stringify(data) })
  }

  // -- Orders --

  async listOrders(params?: { customer_id?: string; limit?: number; starting_after?: string }): Promise<ListResponse<Order>> {
    const sp = new URLSearchParams()
    if (params?.customer_id) sp.set('customer_id', params.customer_id)
    if (params?.limit) sp.set('limit', String(params.limit))
    if (params?.starting_after) sp.set('starting_after', params.starting_after)
    const qs = sp.toString()
    return this.request<ListResponse<Order>>(`/orders${qs ? `?${qs}` : ''}`)
  }

  async getOrder(id: string): Promise<Order> { return this.request<Order>(`/orders/${id}`) }

  async getCustomerOrders(customerId: string): Promise<Order[]> {
    return fetchAllCustomerOrders((path, opts) => this.request(path, opts), customerId)
  }

  // -- Auth (OTP) --

  async sendCode(email: string): Promise<SendCodeResponse> {
    return this.request<SendCodeResponse>('/storefront/auth/send-code', { method: 'POST', body: JSON.stringify({ email }) })
  }

  async verifyCode(email: string, code: string): Promise<VerifyCodeResponse> {
    return this.request<VerifyCodeResponse>('/storefront/auth/verify-code', { method: 'POST', body: JSON.stringify({ email, code }) })
  }

  // -- Customer Analytics --

  async getCustomerAnalytics(customerId: string, customerName?: string): Promise<CustomerAnalytics | null> {
    return findCustomerAnalytics((path) => this.request(path), customerId, customerName)
  }

  // -- Locations --

  async listLocations(): Promise<ListResponse<Location>> { return this.request<ListResponse<Location>>('/locations') }

  // -- COA --

  getCOAEmbedUrl(productId: string): string {
    return `${this.baseUrl}/v1/stores/${this.storeId}/coa/${productId}/embed`
  }

  // -- Storefront Config --

  async fetchStorefrontConfig(): Promise<StorefrontConfig> {
    return this.request<StorefrontConfig>('/storefront/config')
  }

  // -- Analytics / Storefront Sessions --

  async createSession(params: { user_agent?: string; referrer?: string }): Promise<StorefrontSession> {
    return this.request<StorefrontSession>('/storefront/sessions', { method: 'POST', body: JSON.stringify(params) })
  }

  async updateSession(sessionId: string, params: { last_active_at?: string; customer_id?: string }): Promise<StorefrontSession> {
    return this.request<StorefrontSession>(`/storefront/sessions/${sessionId}`, { method: 'PATCH', body: JSON.stringify(params) })
  }

  async trackEvent(params: { session_id: string; event_type: EventType; event_data?: Record<string, unknown> }): Promise<void> {
    const url = `${this.baseUrl}/v1/stores/${this.storeId}/storefront/events`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
    }
    if (this._sessionToken) headers['Authorization'] = `Bearer ${this._sessionToken}`
    await resilientSend(url, params, headers)
  }

  // -- Static Media Utilities --

  static encodeBase64Url = encodeBase64Url
  static signMedia = signMedia
}
