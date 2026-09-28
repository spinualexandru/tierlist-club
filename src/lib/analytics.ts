/** Events counted per tier list by the Worker's `/api/event` (see `worker/index.ts`). */
export type AnalyticsEvent = 'list_started' | 'png_exported'

/**
 * Record an event for a tier list, fire-and-forget. `sendBeacon` survives the
 * page unloading and never delays the UI. Skipped in the Vite dev server, which
 * has no Worker behind it.
 */
export const track = (event: AnalyticsEvent, list: string): void => {
  if (import.meta.env.DEV) return
  try {
    navigator.sendBeacon('/api/event', JSON.stringify({ event, list }))
  } catch {
    // Analytics must never break the app.
  }
}
