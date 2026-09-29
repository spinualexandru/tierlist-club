import { PAGE_LOADING_ICON } from '../lib/icons'

/** A spinner covering the whole page, e.g. while a shared tier list is being filled in. */
export default function fullScreenLoader(label: string): string {
  return html`
    <div
      role="status"
      class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background text-foreground/60"
    >
      ${PAGE_LOADING_ICON}
      <p class="m-0 text-sm font-medium text-foreground/70">${label}</p>
    </div>
  `
}
