/**
 * Resilient HTTP sender for analytics/event payloads.
 *
 * Retries transient (5xx / network) failures with linear back-off,
 * then falls back to navigator.sendBeacon so the event still lands
 * even when the tab is being unloaded.
 *
 * 4xx responses are NOT retried — they indicate a client error that
 * won't resolve by resending.
 */

const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1000

export async function resilientSend(
  url: string,
  payload: object,
  headers: Record<string, string>,
): Promise<void> {
  const body = JSON.stringify(payload)

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body,
        keepalive: true,
      })
      // Success or client-error (4xx) — don't retry
      if (res.ok || res.status < 500) return
    } catch {
      // Network error — retry
    }

    if (attempt < MAX_RETRIES) {
      await new Promise<void>((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)))
    }
  }

  // All retries exhausted — fire-and-forget via sendBeacon
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon(url, body)
  }
}
