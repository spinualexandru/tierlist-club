import fullScreenLoader from '../components/full-screen-loader'
import { Router } from '../lib/router'
import { sharedParamsOf } from '../lib/share'
import { defaultTierList, tierListPath, tierLists } from '../tierlists'
import tierList, { agentHost, openShared } from './tierlist'

/**
 * A shared link (`/?type=<list id>&selections=…`) fills its list in, behind a
 * full-screen loader while the list's options load, then moves on to the
 * list's own path so the link's query doesn't outlive later changes.
 * Invalid selections just open the list as it is.
 */
const openSharedLink = async (app: HTMLDivElement) => {
  const shared = sharedParamsOf(location.search)
  if (!shared) return
  const list = tierLists.find((candidate) => candidate.id === shared.type)
  if (list) {
    app.innerHTML = fullScreenLoader('Loading shared tier list…')
    if (!(await openShared(list, shared.selections)))
      console.warn(`Ignored the invalid shared selections of ${list.id}`)
  }
  history.replaceState(null, '', list ? tierListPath(list) : location.pathname)
}

/**
 * In browsers with WebMCP, AI agents get tools to make tier lists on the page
 * (see src/lib/webmcp.ts), which only they load.
 */
const registerAgentTools = async (app: HTMLDivElement, router: Router) => {
  const { modelContext } = document
  if (!modelContext) return
  const { tierListTools } = await import('../lib/webmcp')
  const host = agentHost(app, tierLists, (list) => router.navigate(tierListPath(list)))
  for (const tool of tierListTools(host)) {
    modelContext
      .registerTool(tool)
      .catch((error) => console.error(`Failed to register the ${tool.name} WebMCP tool`, error))
  }
}

export default async function render(app: HTMLDivElement) {
  await openSharedLink(app)
  const router = new Router(
    [
      {
        path: '/',
        view: (signal) => tierList(app, defaultTierList, signal),
      },
      ...tierLists.map((list) => ({
        path: `/${list.id}`,
        view: (signal: AbortSignal) => tierList(app, list, signal),
      })),
    ],
    app,
  )
  void registerAgentTools(app, router)
  return router
}
