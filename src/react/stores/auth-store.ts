import { createStore } from 'zustand/vanilla'
import { persist } from 'zustand/middleware'
import type { WhaleClient } from '../../client.js'
import type { Customer } from '../../types.js'

export interface AuthState {
  customer: Customer | null
  sessionToken: string | null
  sessionExpiresAt: string | null
  authLoading: boolean
}

export interface AuthActions {
  sendOTP: (email: string) => Promise<boolean>
  verifyOTP: (email: string, code: string) => Promise<boolean>
  restoreSession: () => Promise<void>
  isSessionValid: () => boolean
  logout: () => void
  fetchCustomer: (id: string) => Promise<void>
}

export type AuthStore = ReturnType<typeof createAuthStore>

export function createAuthStore(client: WhaleClient, storagePrefix: string) {
  return createStore<AuthState & AuthActions>()(
    persist(
      (set, get) => ({
        // ── Initial state ────────────────────────────────────────────────
        customer: null,
        sessionToken: null,
        sessionExpiresAt: null,
        authLoading: false,

        // ── Actions ──────────────────────────────────────────────────────
        sendOTP: async (email) => {
          set({ authLoading: true })
          try {
            const res = await client.sendCode(email)
            return res.sent
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Could not send code'
            throw new Error(message)
          } finally {
            set({ authLoading: false })
          }
        },

        verifyOTP: async (email, code) => {
          set({ authLoading: true })
          try {
            const res = await client.verifyCode(email, code)
            client.setSessionToken(res.token_hash)
            set({
              sessionToken: res.token_hash,
              sessionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            })

            if (res.customer?.id) {
              try {
                const full = await client.getCustomer(res.customer.id)
                set({ customer: full })
              } catch {
                set({ customer: res.customer })
              }
            }

            return res.needs_profile ?? false
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Verification failed'
            throw new Error(message)
          } finally {
            set({ authLoading: false })
          }
        },

        restoreSession: async () => {
          const { sessionToken, sessionExpiresAt, customer } = get()
          if (!sessionToken || !sessionExpiresAt) return

          if (new Date(sessionExpiresAt) <= new Date()) {
            client.setSessionToken(null)
            set({ sessionToken: null, sessionExpiresAt: null, customer: null })
            return
          }

          client.setSessionToken(sessionToken)

          if (customer?.id) {
            try {
              const fresh = await client.getCustomer(customer.id)
              set({ customer: fresh })
            } catch {
              client.setSessionToken(null)
              set({ sessionToken: null, sessionExpiresAt: null, customer: null })
            }
          }
        },

        isSessionValid: () => {
          const { sessionToken, sessionExpiresAt } = get()
          if (!sessionToken || !sessionExpiresAt) return false
          return new Date(sessionExpiresAt) > new Date()
        },

        logout: () => {
          client.setSessionToken(null)
          set({ customer: null, sessionToken: null, sessionExpiresAt: null })
        },

        fetchCustomer: async (id) => {
          try {
            const customer = await client.getCustomer(id)
            set({ customer })
          } catch (err) {
            console.error('[whale-storefront] fetchCustomer failed:', err)
          }
        },
      }),

      // ── Persist config ─────────────────────────────────────────────────
      {
        name: `${storagePrefix}-auth`,
        partialize: (state) => ({
          sessionToken: state.sessionToken,
          sessionExpiresAt: state.sessionExpiresAt,
          customer: state.customer
            ? {
                id: state.customer.id,
                email: state.customer.email,
                first_name: state.customer.first_name,
                last_name: state.customer.last_name,
                phone: state.customer.phone,
                loyalty_points: state.customer.loyalty_points,
                loyalty_tier: state.customer.loyalty_tier,
                total_spent: state.customer.total_spent,
                total_orders: state.customer.total_orders,
              }
            : null,
        }),
      }
    )
  )
}
