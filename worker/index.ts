// Serves /api/* and `/`; every other path is a static asset from dist/ (see
// `run_worker_first` in wrangler.jsonc), so the SPA itself never runs this.

interface Env {
  /** Workers Analytics Engine dataset `tierlist_events`. */
  EVENTS: AnalyticsEngineDataset
  /** The static assets in dist/. */
  ASSETS: Fetcher
}

/** Events the app sends from `src/lib/analytics.ts`. */
const EVENTS = new Set(['list_started', 'png_exported'])

/** Tier list ids are short, lowercase, and hyphenated (`models`, `harnesses`). */
const LIST_ID = /^[a-z0-9-]{1,40}$/

/** Only the production site is counted, so preview deployments don't skew the numbers. */
const COUNTED_HOST = 'tierlist.club'

const status = (code: number) => new Response(null, { status: code })

/**
 * `POST /api/event` with `{ event, list }` writes one data point: blob1 is the
 * event, blob2 the list id, blob3 the visitor's country. Sampling is keyed by event.
 */
const recordEvent = async (request: Request, env: Env): Promise<Response> => {
  if (request.method !== 'POST') return status(405)

  const text = await request.text()
  if (text.length > 256) return status(413)

  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return status(400)
  }
  const { event, list } = (body ?? {}) as { event?: unknown; list?: unknown }
  if (typeof event !== 'string' || !EVENTS.has(event)) return status(400)
  if (typeof list !== 'string' || !LIST_ID.test(list)) return status(400)

  if (new URL(request.url).hostname === COUNTED_HOST) {
    const country = typeof request.cf?.country === 'string' ? request.cf.country : ''
    env.EVENTS.writeDataPoint({ blobs: [event, list, country], indexes: [event] })
  }
  return status(204)
}

/**
 * `/` is the default list's page, except for a shared link
 * (`/?type=<list id>&selections=…`), which gets its list's page (`/<list id>`),
 * so link previews and the canonical URL name the list that opens.
 */
const homePage = async (request: Request, env: Env): Promise<Response> => {
  const type = new URL(request.url).searchParams.get('type')
  if (type && LIST_ID.test(type) && (request.method === 'GET' || request.method === 'HEAD')) {
    const page = await env.ASSETS.fetch(new URL(`/${type}`, request.url), {
      method: request.method,
    })
    if (page.ok) return page
  }
  return env.ASSETS.fetch(request)
}

export default {
  fetch(request, env) {
    const { pathname } = new URL(request.url)
    if (pathname === '/api/event') return recordEvent(request, env)
    if (pathname === '/') return homePage(request, env)
    return Promise.resolve(status(404))
  },
} satisfies ExportedHandler<Env>
