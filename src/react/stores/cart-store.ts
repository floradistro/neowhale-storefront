import { createStore } from 'zustand/vanilla'
import { persist } from 'zustand/middleware'
import type { WhaleClient } from '../../client.js'
import type { Cart, CartItem, TaxBreakdown, PaymentData, Order } from '../../types.js'

export interface CartState {
  cartId: string | null
  items: CartItem[]
  itemCount: number
  subtotal: number
  taxAmount: number
  total: number
  taxBreakdown: TaxBreakdown[]
  cartOpen: boolean
  cartLoading: boolean
  productImages: Record<string, string>
  addItemInFlight: boolean
}

export interface CartActions {
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  initCart: () => Promise<void>
  syncCart: () => Promise<void>
  addItem: (
    productId: string,
    quantity: number,
    tier?: string,
    unitPrice?: number,
    imageUrl?: string | null,
    productName?: string
  ) => Promise<void>
  updateQuantity: (itemId: string, quantity: number) => Promise<void>
  removeItem: (itemId: string, productName?: string) => Promise<void>
  clearCart: () => void
  checkout: (customerEmail?: string, payment?: PaymentData) => Promise<Order>
}

export type CartStore = ReturnType<typeof createCartStore>

export function createCartStore(
  client: WhaleClient,
  storagePrefix: string,
  onAddToCart?: (productId: string, productName: string, quantity: number, price: number, tier?: string) => void,
  onRemoveFromCart?: (productId: string, productName: string) => void
) {
  return createStore<CartState & CartActions>()(
    persist(
      (set, get) => ({
        // ── Initial state ────────────────────────────────────────────────
        cartId: null,
        items: [],
        itemCount: 0,
        subtotal: 0,
        taxAmount: 0,
        total: 0,
        taxBreakdown: [],
        cartOpen: false,
        cartLoading: false,
        productImages: {},
        addItemInFlight: false,

        // ── Cart UI ──────────────────────────────────────────────────────
        openCart: () => set({ cartOpen: true }),
        closeCart: () => set({ cartOpen: false }),
        toggleCart: () => set((s) => ({ cartOpen: !s.cartOpen })),

        // ── Cart data ────────────────────────────────────────────────────
        initCart: async () => {
          const { cartId, syncCart } = get()

          if (cartId) {
            try {
              await syncCart()
            } catch {
              const cart = await client.createCart()
              applyCart(set, get, cart)
            }
            return
          }

          try {
            const cart = await client.createCart()
            applyCart(set, get, cart)
          } catch (err) {
            console.error('[whale-storefront] initCart failed:', err)
          }
        },

        syncCart: async () => {
          const { cartId, productImages } = get()
          if (!cartId) return

          try {
            const cart = await client.getCart(cartId)
            const items = (cart.items ?? []).map((item) => ({
              ...item,
              image_url: item.image_url || productImages[item.product_id] || null,
            }))
            set({
              items,
              itemCount: cart.item_count ?? 0,
              subtotal: cart.subtotal ?? 0,
              taxAmount: cart.tax_amount ?? 0,
              total: cart.total ?? 0,
              taxBreakdown: cart.tax_breakdown ?? [],
            })
          } catch (err) {
            console.error('[whale-storefront] syncCart failed:', err)
            throw err
          }
        },

        addItem: async (productId, quantity, tier, unitPrice, imageUrl, productName) => {
          // Race-condition guard: prevent double-click
          if (get().addItemInFlight) return
          set({ cartLoading: true, addItemInFlight: true })

          try {
            let { cartId } = get()

            if (!cartId) {
              await get().initCart()
              cartId = get().cartId
            }

            if (!cartId) throw new Error('Could not initialise cart')

            if (imageUrl) {
              set((s) => ({ productImages: { ...s.productImages, [productId]: imageUrl } }))
            }

            try {
              await client.addToCart(cartId, productId, quantity, { tier, unitPrice })
            } catch (err: unknown) {
              // Cart expired (404/410) — auto-recover
              const status = (err as { status?: number }).status
              if (status === 404 || status === 410) {
                const newCart = await client.createCart()
                set({ cartId: newCart.id })
                await client.addToCart(newCart.id, productId, quantity, { tier, unitPrice })
              } else {
                throw err
              }
            }

            await get().syncCart()

            // Analytics callback
            onAddToCart?.(productId, productName || '', quantity, unitPrice || 0, tier)
          } finally {
            set({ cartLoading: false, addItemInFlight: false })
          }
        },

        updateQuantity: async (itemId, quantity) => {
          set({ cartLoading: true })
          try {
            const { cartId } = get()
            if (!cartId) return
            await client.updateCartItem(cartId, itemId, quantity)
            await get().syncCart()
          } finally {
            set({ cartLoading: false })
          }
        },

        removeItem: async (itemId, productName) => {
          set({ cartLoading: true })
          try {
            const { cartId, items } = get()
            if (!cartId) return

            const item = items.find((i) => i.id === itemId)
            await client.removeCartItem(cartId, itemId)
            await get().syncCart()

            if (item) {
              onRemoveFromCart?.(item.product_id, productName || item.product_name)
            }
          } finally {
            set({ cartLoading: false })
          }
        },

        clearCart: () => {
          set({
            cartId: null,
            items: [],
            itemCount: 0,
            subtotal: 0,
            taxAmount: 0,
            total: 0,
            taxBreakdown: [],
            productImages: {},
          })
        },

        checkout: async (customerEmail, payment) => {
          const { cartId } = get()
          if (!cartId) throw new Error('No active cart')

          set({ cartLoading: true })
          try {
            const order = await client.checkout(cartId, customerEmail, payment)
            set({
              cartId: null,
              items: [],
              itemCount: 0,
              subtotal: 0,
              taxAmount: 0,
              total: 0,
              taxBreakdown: [],
              productImages: {},
              cartOpen: false,
            })
            return order
          } finally {
            set({ cartLoading: false })
          }
        },
      }),

      // ── Persist config ─────────────────────────────────────────────────
      {
        name: `${storagePrefix}-cart`,
        partialize: (state) => ({
          cartId: state.cartId,
          productImages: state.productImages,
        }),
      }
    )
  )
}

function applyCart(
  set: (partial: Partial<CartState>) => void,
  get: () => CartState,
  cart: Cart
) {
  const productImages = get().productImages
  const items = (cart.items ?? []).map((item) => ({
    ...item,
    image_url: item.image_url || productImages[item.product_id] || null,
  }))
  set({
    cartId: cart.id,
    items,
    itemCount: cart.item_count ?? 0,
    subtotal: cart.subtotal ?? 0,
    taxAmount: cart.tax_amount ?? 0,
    total: cart.total ?? 0,
    taxBreakdown: cart.tax_breakdown ?? [],
  })
}
