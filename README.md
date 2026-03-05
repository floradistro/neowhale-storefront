# @neowhale/storefront

React and Next.js SDK for WhaleTools storefronts. Provides a typed API client, React hooks for cart/auth/analytics, and Next.js server utilities -- everything needed to build a headless storefront against the Whale Gateway API.

**v0.1.1** | [npm](https://www.npmjs.com/package/@neowhale/storefront)

---

## Install

```bash
npm install @neowhale/storefront zustand
```

Peer dependencies:

| Package     | Version  | Required |
|-------------|----------|----------|
| react       | >=18     | yes      |
| react-dom   | >=18     | yes      |
| zustand     | >=5      | yes      |
| next        | >=14     | no       |

---

## Quick Start

### 1. Environment Variables

```env
NEXT_PUBLIC_WHALE_STORE_ID=your-store-id
NEXT_PUBLIC_WHALE_API_KEY=your-api-key
WHALE_MEDIA_SIGNING_SECRET=your-signing-secret   # optional, for signed image URLs
```

### 2. Root Layout

```tsx
// app/layout.tsx
import { WhaleProvider } from '@neowhale/storefront/react';
import { getAllProducts } from '@neowhale/storefront/next';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const products = await getAllProducts();

  return (
    <html lang="en">
      <body>
        <WhaleProvider
          storeId={process.env.NEXT_PUBLIC_WHALE_STORE_ID!}
          apiKey={process.env.NEXT_PUBLIC_WHALE_API_KEY!}
          products={products}
        >
          {children}
        </WhaleProvider>
      </body>
    </html>
  );
}
```

### 3. Use Hooks in a Page

```tsx
'use client';

import { useProducts, useCart } from '@neowhale/storefront/react';

export default function Shop() {
  const { products } = useProducts();
  const { addItem, itemCount, openCart } = useCart();

  return (
    <div>
      <button onClick={openCart}>Cart ({itemCount})</button>
      {products.map((p) => (
        <div key={p.id}>
          <h2>{p.name}</h2>
          <button onClick={() => addItem(p.id, 1)}>Add to Cart</button>
        </div>
      ))}
    </div>
  );
}
```

### 4. Next.js Config (optional proxy + security headers)

```ts
// next.config.ts
import { withSecurityHeaders, whaleGatewayRewrite } from '@neowhale/storefront/next';

const nextConfig = {
  headers: withSecurityHeaders(),
  rewrites: async () => ({
    beforeFiles: [whaleGatewayRewrite()],
  }),
};

export default nextConfig;
```

---

## Entry Points

The package ships three entry points, each with ESM, CJS, and TypeScript declarations.

| Import path                      | Purpose                          |
|----------------------------------|----------------------------------|
| `@neowhale/storefront`           | Core API client and types        |
| `@neowhale/storefront/react`     | React provider, hooks, components|
| `@neowhale/storefront/next`      | Next.js server utilities         |

---

## API Reference -- Core

```ts
import { WhaleClient } from '@neowhale/storefront';
```

### WhaleClient

#### Constructor

```ts
new WhaleClient(config: WhaleStorefrontConfig)
```

| Config field         | Type     | Default                          | Description                        |
|----------------------|----------|----------------------------------|------------------------------------|
| storeId              | string   | --                               | Required. Your store UUID.         |
| apiKey               | string   | --                               | Required. API key for the gateway. |
| gatewayUrl           | string   | `https://whale-gateway.fly.dev`  | Base URL of the Whale Gateway.     |
| proxyPath            | string   | `/api/gw`                        | Local proxy route prefix.          |
| mediaSigningSecret   | string   | --                               | Secret for signed image URLs.      |
| supabaseHost         | string   | --                               | Supabase project host.             |
| storagePrefix        | string   | `whale`                          | Prefix for local storage keys.     |
| sessionTtl           | number   | `1800000` (30 min)               | Session TTL in milliseconds.       |
| debug                | boolean  | --                               | Enable debug logging.              |

#### Products

```ts
client.listProducts(params?)        // → ListResponse<Product>
client.getProduct(id)               // → Product
client.getAllProducts(options?)      // → Product[]  (auto-paginates, default status='published', maxPages=20)
```

#### Cart

```ts
client.createCart(customerEmail?)                     // → Cart
client.getCart(cartId)                                // → Cart
client.addToCart(cartId, productId, quantity, opts?)   // → CartItem
client.updateCartItem(cartId, itemId, quantity)        // → Cart
client.removeCartItem(cartId, itemId)                  // → void
client.checkout(cartId, customerEmail?, payment?)      // → Order
```

#### Customers

```ts
client.findCustomer(query)     // → Customer[]
client.getCustomer(id)         // → Customer
client.createCustomer(data)    // → Customer
```

#### Orders

```ts
client.listOrders(params?)                // → ListResponse<Order>
client.getOrder(id)                       // → Order
client.getCustomerOrders(customerId)      // → Order[]  (auto-paginates)
```

#### Auth

```ts
client.sendCode(email)            // → SendCodeResponse
client.verifyCode(email, code)    // → VerifyCodeResponse
client.setSessionToken(token)     // → void
client.getSessionToken()          // → string | null
```

#### Analytics

```ts
client.getCustomerAnalytics(customerId, customerName?)  // → CustomerAnalytics | null
client.createSession(params)                            // → StorefrontSession
client.updateSession(sessionId, params)                 // → StorefrontSession
client.trackEvent(params)                               // → void
```

#### Locations

```ts
client.listLocations()  // → ListResponse<Location>
```

#### COA

```ts
client.getCOAEmbedUrl(productId)  // → string
```

#### Static Methods

```ts
WhaleClient.signMedia(secret, encodedUrl, w, q, f)  // → string (signed token)
WhaleClient.encodeBase64Url(url)                     // → string (base64url-encoded)
```

---

## API Reference -- React

```ts
import {
  WhaleProvider,
  useCart,
  useCartItemCount,
  useCartTotal,
  useAuth,
  useProducts,
  useProduct,
  useAnalytics,
  useCustomerOrders,
  useCustomerAnalytics,
  useWhaleClient,
} from '@neowhale/storefront/react';
```

### WhaleProvider

Wrap your application tree with this provider. It accepts all `WhaleStorefrontConfig` fields as props, plus:

| Prop      | Type       | Description                             |
|-----------|------------|-----------------------------------------|
| products  | Product[]  | Pre-fetched product catalog to hydrate. |
| children  | ReactNode  | Application tree.                       |

Internally renders `AuthInitializer`, `CartInitializer`, and `AnalyticsTracker`.

### useCart()

Manage cart state and operations.

| Return field     | Type                                           |
|------------------|------------------------------------------------|
| cartId           | string \| null                                 |
| items            | CartItem[]                                     |
| itemCount        | number                                         |
| subtotal         | number                                         |
| taxAmount        | number                                         |
| total            | number                                         |
| taxBreakdown     | object                                         |
| cartOpen         | boolean                                        |
| cartLoading      | boolean                                        |
| productImages    | Record<string, string>                         |
| addItem          | (productId: string, qty: number) => Promise     |
| removeItem       | (itemId: string) => Promise                     |
| updateQuantity   | (itemId: string, qty: number) => Promise        |
| openCart         | () => void                                     |
| closeCart        | () => void                                     |
| toggleCart       | () => void                                     |
| initCart         | () => Promise                                  |
| syncCart         | () => Promise                                  |
| clearCart        | () => void                                     |
| checkout         | (email?: string, payment?: object) => Promise   |

### useCartItemCount()

```ts
const count: number = useCartItemCount();
```

Returns the current number of items in the cart. Optimized selector -- only re-renders when the count changes.

### useCartTotal()

```ts
const total: number = useCartTotal();
```

Returns the cart total. Optimized selector -- only re-renders when the total changes.

### useAuth()

Manage authentication state and OTP flow.

| Return field     | Type                                              |
|------------------|---------------------------------------------------|
| customer         | Customer \| null                                  |
| authLoading      | boolean                                           |
| sessionToken     | string \| null                                    |
| isAuthenticated  | boolean                                           |
| sendCode         | (email: string) => Promise                        |
| verifyCode       | (email: string, code: string) => Promise          |
| restoreSession   | () => Promise                                     |
| logout           | () => void                                        |
| fetchCustomer    | (id: string) => Promise                           |

### useProducts(opts?)

Client-side filtering over the products hydrated by `WhaleProvider`.

```ts
const { products, allProducts, loading } = useProducts({ categoryId: '...', search: 'term' });
```

| Option      | Type    | Description                    |
|-------------|---------|--------------------------------|
| categoryId  | string  | Filter by category ID.         |
| search      | string  | Filter by search term.         |

Returns `{ products: Product[], allProducts: Product[], loading: false }`.

### useProduct(slug)

Look up a single product by slug from the hydrated catalog.

```ts
const { product, loading } = useProduct('blue-dream-3-5g');
```

Returns `{ product: Product | null, loading: false }`.

### useAnalytics()

Track storefront events.

| Method              | Description                          |
|---------------------|--------------------------------------|
| track()             | Send a custom event.                 |
| trackPageView()     | Record a page view.                  |
| trackProductView()  | Record a product detail view.        |
| trackCategoryView() | Record a category page view.         |
| trackSearch()       | Record a search query.               |
| trackBeginCheckout()| Record checkout initiation.          |
| trackPurchase()     | Record a completed purchase.         |
| trackAddToCart()    | Record an add-to-cart event.         |
| trackRemoveFromCart()| Record a remove-from-cart event.    |
| linkCustomer()      | Associate session with a customer.   |
| getOrCreateSession()| Get or create an analytics session.  |

### useCustomerOrders()

Auto-fetches orders when a customer is authenticated.

```ts
const { orders, loading, refresh } = useCustomerOrders();
```

### useCustomerAnalytics()

Returns analytics for the authenticated customer.

```ts
const { analytics, loading } = useCustomerAnalytics();
```

### useWhaleClient()

Access the underlying `WhaleClient` instance from context.

```ts
const client = useWhaleClient();
```

---

## API Reference -- Next.js

```ts
import {
  withSecurityHeaders,
  whaleGatewayRewrite,
  createServerClient,
  getAllProducts,
  createImageLoader,
  createAuthMiddleware,
} from '@neowhale/storefront/next';
```

### withSecurityHeaders(extra?)

Returns a `headers()` config function for `next.config`. Applies security headers (CSP, HSTS, etc.). Pass an optional object to merge additional headers.

```ts
// next.config.ts
export default {
  headers: withSecurityHeaders({ 'X-Custom': 'value' }),
};
```

### whaleGatewayRewrite(gatewayUrl?, proxyPath?)

Returns a single rewrite rule that proxies `proxyPath` (default `/api/gw`) to the Whale Gateway (default `https://whale-gateway.fly.dev`).

```ts
export default {
  rewrites: async () => ({
    beforeFiles: [whaleGatewayRewrite()],
  }),
};
```

### createServerClient(config?)

Creates a `WhaleClient` on the server. Reads `NEXT_PUBLIC_WHALE_STORE_ID`, `NEXT_PUBLIC_WHALE_API_KEY`, and `WHALE_MEDIA_SIGNING_SECRET` from environment variables when config is omitted.

```ts
const client = createServerClient();
const products = await client.getAllProducts();
```

### getAllProducts(options?)

Server-side product fetch with ISR caching. Default `revalidate` is 60 seconds.

```ts
const products = await getAllProducts(); // cached, revalidates every 60s
const products = await getAllProducts({ revalidate: 120 });
```

### createImageLoader(config)

Returns a Next.js image loader function for use with `next/image`. Handles media signing when a secret is provided.

```ts
import Image from 'next/image';
import { createImageLoader } from '@neowhale/storefront/next';

const loader = createImageLoader({
  mediaSigningSecret: process.env.WHALE_MEDIA_SIGNING_SECRET,
  supabaseHost: 'your-project.supabase.co',
});

<Image loader={loader} src={product.imageUrl} width={400} height={400} alt="" />
```

### createAuthMiddleware(options)

Returns a Next.js middleware function for protecting routes with session-based auth.

```ts
// middleware.ts
import { createAuthMiddleware } from '@neowhale/storefront/next';

export default createAuthMiddleware({
  protectedPaths: ['/account', '/orders'],
  loginPath: '/login',
});

export const config = { matcher: ['/account/:path*', '/orders/:path*'] };
```

---

## Key Types

| Type                 | Description                                |
|----------------------|--------------------------------------------|
| WhaleStorefrontConfig| Client constructor config object.          |
| Product              | Product with name, slug, price, images, etc.|
| Cart                 | Cart with items, totals, tax breakdown.    |
| CartItem             | Single cart line item.                     |
| Customer             | Customer profile.                          |
| Order                | Completed or pending order.                |
| ListResponse\<T\>   | Paginated list: `{ data: T[], meta }`.     |
| SendCodeResponse     | Response from OTP send.                    |
| VerifyCodeResponse   | Response from OTP verify (includes token). |
| CustomerAnalytics    | Aggregated analytics for a customer.       |
| StorefrontSession    | Analytics session object.                  |
| Location             | Store/pickup location.                     |

All types are exported from the root entry point (`@neowhale/storefront`).

---

## License

MIT
