// @neowhale/storefront/react — React entry point

// Provider
export { WhaleProvider } from './provider.js'
export type { WhaleProviderProps } from './provider.js'

// Context
export { WhaleContext } from './context.js'
export type { WhaleContextValue } from './context.js'

// Hooks
export { useCart, useCartItemCount, useCartTotal } from './hooks/use-cart.js'
export { useAuth } from './hooks/use-auth.js'
export { useProducts, useProduct } from './hooks/use-products.js'
export { useAnalytics } from './hooks/use-analytics.js'
export { useWhaleClient } from './hooks/use-client.js'
export { useCustomerOrders, useCustomerAnalytics } from './hooks/use-customer.js'

// Components (for advanced use — normally auto-included by WhaleProvider)
export { AnalyticsTracker } from './components/analytics-tracker.js'
export { CartInitializer } from './components/cart-initializer.js'
export { AuthInitializer } from './components/auth-initializer.js'

// Store types (for consumers who need to create custom selectors)
export type { CartState, CartActions, CartStore } from './stores/cart-store.js'
export type { AuthState, AuthActions, AuthStore } from './stores/auth-store.js'
