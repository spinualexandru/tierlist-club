import { Router } from '../lib/router'
import { defaultTierList, tierLists } from '../tierlists'
import tierList from './tierlist'

export default function render(app: HTMLDivElement) {
  return new Router(
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
}
