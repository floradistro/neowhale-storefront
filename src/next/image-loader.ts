import { WhaleClient } from '../client.js'

const ALLOWED_WIDTHS = [64, 96, 128, 256, 384, 640, 828, 1080, 1280, 1920]

function snapWidth(w: number): number {
  for (const aw of ALLOWED_WIDTHS) {
    if (aw >= w) return aw
  }
  return ALLOWED_WIDTHS[ALLOWED_WIDTHS.length - 1]
}

interface ImageLoaderParams {
  src: string
  width: number
  quality?: number
}

/**
 * Creates a Next.js custom image loader that proxies Supabase images through gateway.
 *
 * Usage in a loader file (e.g. src/lib/image-loader.ts):
 * ```ts
 * import { createImageLoader } from '@neowhale/storefront/next'
 * export default createImageLoader({
 *   storeId: process.env.NEXT_PUBLIC_STORE_ID!,
 *   gatewayUrl: 'https://whale-gateway.fly.dev',
 *   supabaseHost: 'your-project.supabase.co',
 *   signingSecret: process.env.NEXT_PUBLIC_MEDIA_SIGNING_SECRET!,
 * })
 * ```
 */
export function createImageLoader(config: {
  storeId: string
  gatewayUrl: string
  supabaseHost: string
  signingSecret: string
}): (params: ImageLoaderParams) => string {
  return ({ src, width, quality }: ImageLoaderParams): string => {
    if (!src.includes(config.supabaseHost)) {
      return src
    }

    const w = String(snapWidth(width))
    const q = String(quality || 80)
    const f = 'webp'
    const encoded = WhaleClient.encodeBase64Url(src)
    const s = WhaleClient.signMedia(config.signingSecret, encoded, w, q, f)

    return `${config.gatewayUrl}/v1/stores/${config.storeId}/media?url=${encoded}&w=${w}&q=${q}&f=${f}&s=${s}`
  }
}
