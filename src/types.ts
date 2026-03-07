// ─── Domain Types ────────────────────────────────────────────────────────────
// Matches whale-gateway API response shapes exactly.

export interface PricingTier {
  id: string
  unit: string
  label: string
  quantity: number
  sort_order: number
  default_price: number
}

export interface ProductVariation {
  id: string
  product_id: string
  name: string
  sku: string | null
  price: number
  stock_quantity: number
  attributes: Record<string, string>
}

export interface Product {
  id: string
  name: string
  slug: string
  sku: string | null
  description: string | null
  status: string
  type: string
  primary_category_id: string
  featured_image: string | null
  image_gallery: string[]
  pricing_data: PricingTier[] | { mode?: string; tiers?: PricingTier[] } | null
  custom_fields: Record<string, string | null>
  stock_quantity?: number
}

export interface Category {
  id: string
  name: string
  slug: string
}

export interface CartItem {
  id: string
  product_id: string
  product_name: string
  image_url: string | null
  quantity: number
  unit_price: number
  tier_label: string | null
  line_total: number
}

export interface TaxBreakdown {
  name: string
  rate: number
  type: string
  rate_decimal: number
}

export interface Cart {
  id: string
  items: CartItem[]
  item_count: number
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  tax_breakdown: TaxBreakdown[]
  discount_amount: number
  customer_email: string | null
}

export interface Order {
  id: string
  order_number: string
  status: string
  total_amount: number
  subtotal: number
  tax_amount: number
  discount_amount: number
  item_count?: number
  created_at: string
  payment_status?: string
  fulfillment_status?: string
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  product_name: string
  quantity: number
  unit_price?: number
  cost_per_unit?: number
  line_total: number
}

export interface Customer {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  loyalty_points: number
  loyalty_tier: string
  total_spent: number
  total_orders: number
  lifetime_value?: number
  street_address?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  date_of_birth?: string | null
  created_at?: string
  is_staff?: boolean
  email_consent?: boolean
  sms_consent?: boolean
}

export interface Address {
  firstName: string
  lastName: string
  address: string
  city: string
  state: string
  zip: string
  country: string
}

export interface PaymentData {
  payment_method: 'card' | 'cash'
  opaque_data?: {
    dataDescriptor: string
    dataValue: string
  }
  billTo?: Address
  shipTo?: Address
}

export interface CustomerAnalytics {
  customer_id: string
  customer_name: string
  total_orders: number
  lifetime_revenue: number
  avg_order_value: number
  ltv_tier: string
  rfm_segment: string
  churn_risk: string
  last_order_date: string
  recency_days: number
}

export interface Location {
  id: string
  name: string
  address?: string
  city?: string
  state?: string
  zip?: string
  phone?: string
  is_active?: boolean
}

export interface SendCodeResponse {
  sent: boolean
}

export interface VerifyCodeResponse {
  object: string
  token_hash: string
  needs_profile: boolean
  customer: Customer | null
}

export interface StorefrontSession {
  id: string
  store_id: string
  customer_id?: string
  started_at: string
  last_active_at: string
}

// ─── Generic Responses ──────────────────────────────────────────────────────

export interface ListResponse<T> {
  object: 'list'
  data: T[]
  has_more: boolean
  cursors?: {
    before?: string
    after?: string
  }
  url?: string
}

// ─── Config ─────────────────────────────────────────────────────────────────

export interface WhaleStorefrontConfig {
  /** Store UUID */
  storeId: string
  /** API key (wk_live_... or wk_test_...) */
  apiKey: string
  /** Gateway base URL. Defaults to https://whale-gateway.fly.dev */
  gatewayUrl?: string
  /** Client-side proxy path. Defaults to /api/gw */
  proxyPath?: string
  /** Media signing secret for image/video proxy */
  mediaSigningSecret?: string
  /** Supabase host for media URL detection */
  supabaseHost?: string
  /** localStorage key prefix. Defaults to "whale" */
  storagePrefix?: string
  /** Analytics session TTL in ms. Defaults to 30 minutes */
  sessionTtl?: number
  /** Enable debug logging */
  debug?: boolean
  /**
   * Master toggle for all tracking (analytics, pixels, behavioral).
   * When false every tracking call is a no-op.
   * Defaults to true; can also be set via NEXT_PUBLIC_TRACKING_ENABLED env var.
   */
  trackingEnabled?: boolean
  /**
   * Fraction of sessions that record full behavioral replays (0 – 1).
   * 0 = never, 1 = every session. Defaults to 0.1 (10 %).
   * Can also be set via NEXT_PUBLIC_RECORDING_RATE env var.
   */
  recordingRate?: number
}

// ─── Event Types ────────────────────────────────────────────────────────────

export type EventType =
  | 'page_view'
  | 'product_view'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'begin_checkout'
  | 'purchase'
  | 'category_view'
  | 'search'

// Re-export pixel types for consumers
export type { PixelConfig, StorefrontConfig } from './pixels/types.js'
