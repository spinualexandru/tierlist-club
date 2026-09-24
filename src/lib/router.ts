/**
 * Renders a route. The signal aborts when the route is left, so views can tie
 * listeners and subscriptions to it.
 */
export type RouteHandler = (signal: AbortSignal) => string

export interface Route {
  path: string
  view: RouteHandler
}

export class Router {
  private routes: Route[]
  private outlet: HTMLElement
  private current?: AbortController

  constructor(routes: Route[], outlet: HTMLElement) {
    this.routes = routes
    this.outlet = outlet

    // Handle back / forward browser navigation
    window.addEventListener('popstate', () => this.render())

    // Intercept client-side link clicks (data-link)
    document.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-link]')
      if (target) {
        e.preventDefault()
        this.navigate(target.getAttribute('href') || '/')
      }
    })

    this.render()
  }

  public navigate(url: string): void {
    if (window.location.pathname !== url) {
      window.history.pushState(null, '', url)
      this.render()
    }
  }

  private render(): void {
    this.current?.abort()
    this.current = new AbortController()

    const currentPath = window.location.pathname
    const match =
      this.routes.find((r) => r.path === currentPath) ?? this.routes.find((r) => r.path === '*')

    this.outlet.innerHTML = match ? match.view(this.current.signal) : html`<h1>404 Not Found</h1>`
  }
}
