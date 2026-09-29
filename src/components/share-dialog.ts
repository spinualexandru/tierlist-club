import { CLOSE_ICON, COPIED_ICON, COPY_ICON } from '../lib/icons'
import { escapeHtml } from '../lib/render'

export interface ShareDialogProps {
  /** The link to the tier list as it's ranked now, or null while nothing is ranked. */
  url: string | null
}

/**
 * Contents of the share dialog (the view's `<dialog data-share-dialog>`): the
 * link in a read-only field (`data-share-url`) with a copy button beside it
 * (`data-share-copy`, which shows a check while it's `data-copied`), and
 * `data-share-close` to close it.
 */
export default function shareDialog({ url }: ShareDialogProps): string {
  return html`
    <div class="flex flex-col gap-4 p-5">
      <header class="flex items-start gap-3">
        <div class="flex-1 min-w-0">
          <h2 id="share-dialog-title" class="m-0 text-base font-semibold">Share tier list</h2>
          <p class="m-0 mt-0.5 text-xs text-white/50">
            ${
              url
                ? 'Anyone with this link sees your ranking.'
                : 'Rank some options first — there’s nothing to share yet.'
            }
          </p>
        </div>
        <button
          type="button"
          data-share-close
          aria-label="Close"
          class="m-0 -mt-1 -mr-1 p-0 inline-flex items-center justify-center h-9 w-9 rounded-lg text-white/60 cursor-pointer hover:bg-white/10 hover:text-white active:scale-90 transition duration-150 ease-out focus-visible:outline-2 focus-visible:outline-white"
        >
          ${CLOSE_ICON}
        </button>
      </header>
      ${
        url
          ? html`
              <div class="flex items-center gap-2">
                <input
                  type="text"
                  readonly
                  data-share-url
                  value="${escapeHtml(url)}"
                  aria-label="Link to this tier list"
                  spellcheck="false"
                  class="flex-1 min-w-0 h-10 px-3 rounded-xl bg-white/5 text-sm text-white/80 font-mono truncate outline-none focus:bg-white/10 focus:outline-2 focus:outline-white transition duration-150 ease-out"
                />
                <button
                  type="button"
                  data-share-copy
                  aria-label="Copy link"
                  class="group m-0 inline-flex items-center justify-center gap-2 h-10 px-3 rounded-xl bg-brand text-sm font-semibold text-tier-text cursor-pointer select-none hover:brightness-110 active:scale-95 transition duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  ${COPY_ICON}${COPIED_ICON}
                  <span data-share-copy-label>Copy</span>
                </button>
              </div>
            `
          : ''
      }
    </div>
  `
}
