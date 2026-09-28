export interface SiteHeaderLink {
  href: string
  /** Short name shown in the switcher, e.g. 'Models'. */
  label: string
  /** Full name, for the tooltip. */
  title: string
  active: boolean
}

export interface SiteHeaderProps {
  /** One link per tier list, in switcher order. */
  links: SiteHeaderLink[]
}

/**
 * The wordmark and a pill switcher between the tier lists: a rainbow-bordered
 * track whose active segment is filled with the tier colors. Links use
 * `data-link`, so the router handles them without a page load. The fill is a
 * separate `data-switch-pill` behind the active label, so it can slide over
 * from the previous list (see `src/views/site-header.ts`); the nav's `isolate`
 * keeps it behind both labels as it passes, not just its own.
 */
export default function siteHeader({ links }: SiteHeaderProps): string {
  return html`
    <header class="flex items-center gap-4 sm:gap-8 md:gap-10 shrink-0 pb-2 sm:pb-4 md:pb-6">
      <a
        href="/"
        data-link
        class="text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight text-tier-f no-underline rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >tierlist.club</a
      >
      <nav aria-label="Tier lists" class="rainbow-border relative isolate inline-flex rounded-full">
        ${links
          .map(
            ({ href, label, title, active }) => html`
              <a
                href="${href}"
                data-link
                title="${title}"
                ${active ? 'aria-current="page"' : ''}
                class="${
                  active ? 'text-tier-text' : 'text-white hover:bg-white/10'
                } relative inline-flex items-center h-9 sm:h-10 md:h-11 px-4 sm:px-5 md:px-6 rounded-full text-base sm:text-lg md:text-xl no-underline select-none transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >${
                  active
                    ? html`<span
                        data-switch-pill
                        aria-hidden="true"
                        class="rainbow-fill absolute inset-0 -z-10 rounded-full"
                      ></span>`
                    : ''
                }${label}</a
              >
            `,
          )
          .join('')}
      </nav>
    </header>
  `
}
