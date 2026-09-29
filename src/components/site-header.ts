import { CHECK_ICON, CHEVRON_DOWN_ICON, THEME_ICONS } from '../lib/icons'
import { systemTheme, themeLabel, type ThemeMode } from '../lib/theme'

export interface SiteHeaderLink {
  href: string
  /** Short name shown in the switcher's menu, e.g. 'Models'. */
  label: string
  /** Full name, for the tooltip. */
  title: string
  active: boolean
}

export interface SiteHeaderProps {
  /** One link per tier list, in switcher order. */
  links: SiteHeaderLink[]
  /** The theme the toggle shows. */
  themeMode: ThemeMode
}

/**
 * The logo and wordmark, and a dropdown switching between the tier lists: a
 * button labeled "Tier type" that opens a `data-list-menu` popover (see
 * `.list-menu` in style.css) with one `data-link` per list, the active one checked. The popover closes
 * itself on outside clicks and Escape; the view closes it on a pick. Beside it,
 * the theme toggle (`data-theme-toggle`) shows the theme mode as a computer
 * (following the system), sun, or moon (pinned); the view flips the mode on a
 * click (see `nextThemeMode`) and keeps its `data-mode` and label up to date.
 */
export default function siteHeader({ links, themeMode }: SiteHeaderProps): string {
  return html`
    <header class="flex items-center justify-between gap-4 shrink-0 mb-5">
      <a
        href="/"
        data-link
        aria-label="tierlist.club"
        class="flex items-center gap-2 no-underline rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
      >
        <img src="/logo.svg" alt="" width="48" height="48" class="h-10 w-10 sm:h-12 sm:w-12" />
        <span class="wordmark text-xl sm:text-2xl leading-none text-foreground"
          >tierlist<span class="text-tier-s">club</span></span
        >
      </a>
      <div class="flex items-center gap-1">
        <button
          type="button"
          popovertarget="list-menu"
          title="Switch tier list"
          class="list-switcher inline-flex items-center gap-1.5 h-10 pl-4 pr-3 rounded-full text-sm text-foreground cursor-pointer select-none hover:bg-foreground/10 active:scale-95 transition duration-150 ease-out focus-visible:outline-2 focus-visible:outline-foreground"
        >
          Tier type ${CHEVRON_DOWN_ICON}
        </button>
        <nav
          id="list-menu"
          data-list-menu
          popover
          aria-label="Tier lists"
          class="list-menu min-w-44 p-1.5 rounded-xl border border-foreground/10 bg-surface text-foreground shadow-2xl shadow-shade"
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
                    active ? 'text-foreground' : 'text-foreground/60 hover:text-foreground'
                  } hover:bg-foreground/5 transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-foreground"
                >
                  ${label} ${active ? CHECK_ICON : ''}
                </a>
              `,
            )
            .join('')}
        </nav>
        <button
          type="button"
          data-theme-toggle
          data-mode="${themeMode}"
          title="${themeLabel(themeMode, systemTheme().matches)}"
          aria-label="${themeLabel(themeMode, systemTheme().matches)}"
          class="theme-toggle inline-grid place-items-center h-10 w-10 -mr-1 sm:mr-0 rounded-full text-foreground cursor-pointer select-none hover:bg-foreground/10 active:scale-95 transition duration-150 ease-out focus-visible:outline-2 focus-visible:outline-foreground"
        >
          ${THEME_ICONS}
        </button>
      </div>
    </header>
  `
}
