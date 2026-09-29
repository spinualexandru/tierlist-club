import { CHECK_ICON, CHEVRON_DOWN_ICON } from '../lib/icons'

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
 * The logo and wordmark, and a dropdown switching between the tier lists: a
 * button naming the active list that opens a `data-list-menu` popover (see
 * `.list-menu` in style.css) with one `data-link` per list. The popover closes
 * itself on outside clicks and Escape; the view closes it on a pick.
 */
export default function siteHeader({ links }: SiteHeaderProps): string {
  const active = links.find((link) => link.active)
  return html`
    <header class="flex items-center justify-between gap-4 shrink-0 mb-5">
      <a
        href="/"
        data-link
        aria-label="tierlist.club"
        class="flex items-center gap-2 no-underline rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
      >
        <img src="/logo.svg" alt="" width="48" height="48" class="h-10 w-10 sm:h-12 sm:w-12" />
        <span class="wordmark text-xl sm:text-2xl leading-none text-white"
          >tierlist<span class="text-tier-s">club</span></span
        >
      </a>
      <div class="flex">
        <button
          type="button"
          popovertarget="list-menu"
          title="Switch tier list"
          class="list-switcher inline-flex items-center gap-1.5 h-10 pl-4 pr-3 -mr-1 sm:mr-0 rounded-full text-sm text-white cursor-pointer select-none hover:bg-white/10 active:scale-95 transition duration-150 ease-out focus-visible:outline-2 focus-visible:outline-white"
        >
          ${active?.label ?? 'Type'} ${CHEVRON_DOWN_ICON}
        </button>
        <nav
          id="list-menu"
          data-list-menu
          popover
          aria-label="Tier lists"
          class="list-menu scheme-dark min-w-44 p-1.5 rounded-xl border border-white/10 bg-neutral-900 text-white shadow-2xl shadow-black/60"
        >
          ${links
            .map(
              ({ href, label, title, active }) => html`
                <a
                  href="${href}"
                  data-link
                  title="${title}"
                  ${active ? 'aria-current="page"' : ''}
                  class="flex items-center justify-between gap-4 h-10 px-3 rounded-lg text-sm no-underline select-none ${
                    active ? 'text-white' : 'text-white/60 hover:text-white'
                  } hover:bg-white/5 transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-white"
                >
                  ${label} ${active ? CHECK_ICON : ''}
                </a>
              `,
            )
            .join('')}
        </nav>
      </div>
    </header>
  `
}
