// @neowhale/storefront — Core entry point (no React)
export { WhaleClient } from './client.js'
export { PixelManager } from './pixels/pixel-manager.js'
export { resilientSend } from './resilient-send.js'
export type {
  Product,
  PricingTier,
  ProductVariation,
  Category,
  Cart,
  CartItem,
  TaxBreakdown,
  Order,
  OrderItem,
  Customer,
  Address,
  PaymentData,
  CustomerAnalytics,
  Location,
  SendCodeResponse,
  VerifyCodeResponse,
  StorefrontSession,
  ListResponse,
  WhaleStorefrontConfig,
  EventType,
  PixelConfig,
  StorefrontConfig,
} from './types.js'
