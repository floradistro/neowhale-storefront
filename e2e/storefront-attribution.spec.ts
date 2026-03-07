/**
 * Storefront Attribution E2E Tests
 *
 * Platform-level tests for @neowhale/storefront analytics & attribution.
 * Uses a minimal HTML fixture that replicates the SDK's tracking logic
 * (WhaleClient.trackEvent, useAnalytics session management, Meta pixel stub)
 * and Playwright's page.route() to intercept all Gateway API calls.
 *
 * No real gateway or database is hit — every outbound request is intercepted
 * and assertions are made against the request body.
 */

import { test, expect, type Page, type Route } from '@playwright/test'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORE_ID = 'test-store-e2e'
const API_KEY = 'wk_test_e2e_key'
const SESSION_KEY = 'whale-analytics-session'

/** Captured request from a page.route() intercept. */
interface CapturedRequest {
  url: string
  method: string
  headers: Record<string, string>
  body: Record<string, unknown>
}

/**
 * Install gateway route interceptors that capture POST requests and respond
 * with mock 200 responses.  Returns a mutable array that accumulates every
 * intercepted request body for later assertion.
 */
async function interceptGateway(page: Page): Promise<CapturedRequest[]> {
  const captured: CapturedRequest[] = []

  // Intercept session creation
  await page.route(`**/v1/stores/${STORE_ID}/storefront/sessions`, async (route: Route) => {
    const req = route.request()
    if (req.method() === 'POST') {
      const body = JSON.parse(req.postData() || '{}')
      captured.push({
        url: req.url(),
        method: 'POST',
        headers: Object.fromEntries(
          Object.entries(req.headers()).map(([k, v]) => [k.toLowerCase(), v])
        ),
        body,
      })
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'sess_e2e_' + Date.now(),
          store_id: STORE_ID,
          started_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
        }),
      })
    } else {
      await route.continue()
    }
  })

  // Intercept session updates (PATCH)
  await page.route(`**/v1/stores/${STORE_ID}/storefront/sessions/*`, async (route: Route) => {
    const req = route.request()
    if (req.method() === 'PATCH') {
      const body = JSON.parse(req.postData() || '{}')
      captured.push({
        url: req.url(),
        method: 'PATCH',
        headers: Object.fromEntries(
          Object.entries(req.headers()).map(([k, v]) => [k.toLowerCase(), v])
        ),
        body,
      })
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'patched', store_id: STORE_ID }),
      })
    } else {
      await route.continue()
    }
  })

  // Intercept event tracking
  await page.route(`**/v1/stores/${STORE_ID}/storefront/events`, async (route: Route) => {
    const req = route.request()
    const body = JSON.parse(req.postData() || '{}')
    captured.push({
      url: req.url(),
      method: req.method(),
      headers: Object.fromEntries(
        Object.entries(req.headers()).map(([k, v]) => [k.toLowerCase(), v])
      ),
      body,
    })
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })

  return captured
}

/** Filter captured requests to only event POSTs. */
function eventRequests(captured: CapturedRequest[]): CapturedRequest[] {
  return captured.filter((r) => r.url.includes('/storefront/events'))
}

/** Filter captured requests to only session creation POSTs. */
function sessionCreationRequests(captured: CapturedRequest[]): CapturedRequest[] {
  return captured.filter(
    (r) => r.url.includes('/storefront/sessions') && !r.url.includes('/storefront/sessions/') && r.method === 'POST'
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Storefront Attribution', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test to get a fresh session
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  // =========================================================================
  // 1. Session initialization — first visit creates a session via the Gateway
  //    and persists session ID in localStorage.
  // =========================================================================
  test('creates a session on first visit and stores it in localStorage', async ({ page }) => {
    const captured = await interceptGateway(page)

    // Navigate (triggers harness load, but no auto-tracking — we call manually)
    await page.goto('/')
    await page.waitForSelector('#status:has-text("Loaded")')

    // Trigger a page view which forces session creation
    await page.evaluate(() => window.__harness.trackPageView('/home'))

    // Wait for the session-creation request to land
    await expect.poll(() => sessionCreationRequests(captured).length, {
      timeout: 5000,
      message: 'Expected a session creation POST',
    }).toBeGreaterThanOrEqual(1)

    const sessionReq = sessionCreationRequests(captured)[0]
    expect(sessionReq.body).toHaveProperty('user_agent')
    expect(sessionReq.headers['x-api-key']).toBe(API_KEY)
    expect(sessionReq.headers['content-type']).toBe('application/json')

    // Verify localStorage was populated
    const stored = await page.evaluate((key) => {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : null
    }, SESSION_KEY)

    expect(stored).not.toBeNull()
    expect(stored.id).toMatch(/^sess_e2e_/)
    expect(stored.createdAt).toBeGreaterThan(0)

    // The event request should also have landed
    const events = eventRequests(captured)
    expect(events.length).toBe(1)
    expect(events[0].body.session_id).toBe(stored.id)
    expect(events[0].body.event_type).toBe('page_view')
  })

  // =========================================================================
  // 2. Page view with UTM parameters — UTMs from the URL are included in the
  //    event_data sent to the gateway.
  // =========================================================================
  test('page view includes UTM parameters from the URL', async ({ page }) => {
    const captured = await interceptGateway(page)

    await page.goto('/?utm_source=facebook&utm_medium=cpc&utm_campaign=spring_sale')
    await page.waitForSelector('#status:has-text("Loaded")')

    await page.evaluate(() =>
      window.__harness.trackPageView(window.location.pathname, document.referrer)
    )

    await expect.poll(() => eventRequests(captured).length, {
      timeout: 5000,
      message: 'Expected an event POST with UTM params',
    }).toBeGreaterThanOrEqual(1)

    const event = eventRequests(captured)[0]
    expect(event.body.event_type).toBe('page_view')

    const data = event.body.event_data as Record<string, unknown>
    expect(data.utm_source).toBe('facebook')
    expect(data.utm_medium).toBe('cpc')
    expect(data.utm_campaign).toBe('spring_sale')
    expect(data.url).toBe('/')
    expect(data).toHaveProperty('event_id')
  })

  // =========================================================================
  // 3. Product view event — fires a `product_view` event with correct
  //    event_properties (product_id, product_name, category, price).
  // =========================================================================
  test('product view fires event with correct properties', async ({ page }) => {
    const captured = await interceptGateway(page)

    await page.goto('/')
    await page.waitForSelector('#status:has-text("Loaded")')

    await page.evaluate(() =>
      window.__harness.trackProductView(
        'prod_abc123',
        'Blue Dream 3.5g',
        'flower',
        45.00
      )
    )

    await expect.poll(() => eventRequests(captured).length, {
      timeout: 5000,
      message: 'Expected a product_view event',
    }).toBeGreaterThanOrEqual(1)

    const event = eventRequests(captured)[0]
    expect(event.body.event_type).toBe('product_view')
    expect(event.body.session_id).toBeTruthy()

    const data = event.body.event_data as Record<string, unknown>
    expect(data.product_id).toBe('prod_abc123')
    expect(data.product_name).toBe('Blue Dream 3.5g')
    expect(data.category).toBe('flower')
    expect(data.price).toBe(45.00)
    expect(data.event_id).toBeTruthy()

    // API key must be present on the request
    expect(event.headers['x-api-key']).toBe(API_KEY)
  })

  // =========================================================================
  // 4. Add-to-cart event — fires an `add_to_cart` event with cart data in
  //    properties (product_id, product_name, quantity, price, tier).
  // =========================================================================
  test('add-to-cart fires event with cart data', async ({ page }) => {
    const captured = await interceptGateway(page)

    await page.goto('/')
    await page.waitForSelector('#status:has-text("Loaded")')

    await page.evaluate(() =>
      window.__harness.trackAddToCart(
        'prod_xyz789',
        'Gummy Bears 10pk',
        2,
        24.99,
        '10-pack'
      )
    )

    await expect.poll(() => eventRequests(captured).length, {
      timeout: 5000,
      message: 'Expected an add_to_cart event',
    }).toBeGreaterThanOrEqual(1)

    const event = eventRequests(captured)[0]
    expect(event.body.event_type).toBe('add_to_cart')

    const data = event.body.event_data as Record<string, unknown>
    expect(data.product_id).toBe('prod_xyz789')
    expect(data.product_name).toBe('Gummy Bears 10pk')
    expect(data.quantity).toBe(2)
    expect(data.price).toBe(24.99)
    expect(data.tier).toBe('10-pack')
    expect(data.event_id).toBeTruthy()
  })

  // =========================================================================
  // 5. Event ID consistency — the same event_id is present in both the
  //    gateway analytics call and the Meta pixel call, enabling server-side
  //    deduplication between the client pixel and the Conversions API.
  // =========================================================================
  test('event_id is shared between gateway call and pixel call', async ({ page }) => {
    const captured = await interceptGateway(page)

    await page.goto('/')
    await page.waitForSelector('#status:has-text("Loaded")')

    // Initialize the Meta pixel stub so fbq() calls are queued
    await page.evaluate(() => window.__harness.initPixelStub())

    // Fire a product_view event (goes to both gateway and pixel)
    await page.evaluate(() =>
      window.__harness.trackProductView(
        'prod_dedup_001',
        'Event ID Test Product',
        'testing',
        10.00
      )
    )

    // Wait for gateway event
    await expect.poll(() => eventRequests(captured).length, {
      timeout: 5000,
      message: 'Expected a gateway event',
    }).toBeGreaterThanOrEqual(1)

    const gatewayEvent = eventRequests(captured)[0]
    const gatewayEventId = (gatewayEvent.body.event_data as Record<string, unknown>).event_id

    expect(gatewayEventId).toBeTruthy()
    expect(typeof gatewayEventId).toBe('string')

    // Read the pixel queue — the fbq stub pushes calls into window.fbq.queue
    const pixelCalls = await page.evaluate(() => {
      const fbq = (window as any).fbq
      if (!fbq || !fbq.queue) return []
      return fbq.queue.filter(
        (call: any[]) => call[0] === 'track' && call[1] === 'ViewContent'
      )
    })

    expect(pixelCalls.length).toBeGreaterThanOrEqual(1)

    // The pixel call's third argument (params) should contain the same event_id
    const pixelParams = pixelCalls[0][2] as Record<string, unknown>
    expect(pixelParams.event_id).toBe(gatewayEventId)
  })
})

// ---------------------------------------------------------------------------
// Global type augmentation for the test harness exposed on window
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    __harness: {
      getOrCreateSession: () => Promise<string>
      trackEvent: (eventType: string, eventData?: Record<string, unknown>) => Promise<Record<string, unknown>>
      track: (eventType: string, eventData?: Record<string, unknown>) => Promise<Record<string, unknown>>
      trackPageView: (pathname: string, referrer?: string) => Promise<Record<string, unknown>>
      trackProductView: (productId: string, productName: string, category: string, price: number) => Promise<Record<string, unknown>>
      trackAddToCart: (productId: string, productName: string, quantity: number, price: number, tier?: string) => Promise<Record<string, unknown>>
      extractUtmParams: () => Record<string, string>
      initPixelStub: () => void
      STORE_ID: string
      API_KEY: string
      SESSION_KEY: string
    }
  }
}
