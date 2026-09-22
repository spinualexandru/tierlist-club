import { Router } from '../lib/router'
import home from './home'

export default function render(app: HTMLDivElement) {
  return new Router(
    [
      {
        path: '/',
        view: () => home(app),
      },
    ],
    app,
  )
}
