import { ADD_ALL_ICON, CLOSE_ICON, LOADING_ICON, RETRY_ICON, SEARCH_ICON } from '../lib/icons'
import { escapeHtml } from '../lib/render'
import type { TierOption } from '../lib/tierlist'
import { tierColorClass } from './tier'

/** Whether a tier list's options are there yet: lists that load theirs start out 'loading'. */
export type OptionsStatus = 'loading' | 'failed' | 'ready'

export interface OptionPickerProps {
  /** Tier id the picked options get added to. */
  tier: string
  /** Options that aren't on the list yet and match the search. */
  options: TierOption[]
  /** Whether a search is narrowing `options` down. */
  searching?: boolean
  /** Whether the options are loaded yet (default 'ready'); `options` is empty until then. */
  status?: OptionsStatus
  /** The list's picker filter checkbox (`data-picker-filter`), and whether it's narrowing `options` down. */
  filter?: { label: string; checked: boolean }
}

/**
 * The picker's option grid with an "Add all" footer (`data-pick-all`), or a
 * note while the options load, if they failed to (with a `data-picker-retry`
 * button), or once nothing is left to pick. The view re-renders just this into
 * `data-picker-items` after each pick or search, so the grid keeps its scroll
 * position and the search field keeps its focus.
 */
export const optionPickerItems = ({
  tier,
  options,
  searching,
  status = 'ready',
  filter,
}: OptionPickerProps): string => {
  const filtering = !!filter?.checked
  if (status === 'loading') {
    return html`
      <div
        role="status"
        class="h-full flex flex-col items-center justify-center gap-3 px-6 text-center text-white/60"
      >
        ${LOADING_ICON}
        <p class="text-sm font-medium text-white/70">Loading options…</p>
      </div>
    `
  }

  if (status === 'failed') {
    return html`
      <div
        role="alert"
        class="h-full flex flex-col items-center justify-center gap-1.5 px-6 text-center"
      >
        <p class="text-sm font-medium text-white/70">Couldn't load the options</p>
        <p class="text-xs text-white/45">Check your connection and try again.</p>
        <button
          type="button"
          data-picker-retry
          class="mt-3 m-0 inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-white/10 text-sm font-medium text-white cursor-pointer select-none hover:bg-white/15 active:scale-95 transition duration-150 ease-out focus-visible:outline-2 focus-visible:outline-white"
        >
          ${RETRY_ICON} Try again
        </button>
      </div>
    `
  }

  if (options.length === 0 && searching) {
    return html`
      <div class="h-full flex flex-col items-center justify-center gap-1.5 px-6 text-center">
        <p class="text-sm font-medium text-white/70">No matches</p>
        <p class="text-xs text-white/45">
          ${
            filtering
              ? `Nothing left to add goes by that name, or “${filter?.label}” hides it.`
              : 'Nothing left to add goes by that name.'
          }
        </p>
      </div>
    `
  }

  if (options.length === 0 && filtering) {
    return html`
      <div class="h-full flex flex-col items-center justify-center gap-1.5 px-6 text-center">
        <p class="text-sm font-medium text-white/70">Nothing recent left to add</p>
        <p class="text-xs text-white/45">Uncheck “${filter?.label}” to see the rest.</p>
      </div>
    `
  }

  if (options.length === 0) {
    return html`
      <div class="h-full flex flex-col items-center justify-center gap-1.5 px-6 text-center">
        <p class="text-sm font-medium text-white/70">Everything is on the list</p>
        <p class="text-xs text-white/45">Drag an option onto the trash can to take it off again.</p>
      </div>
    `
  }

  return html`
    <div class="min-h-full flex flex-col">
      <ul class="grid grid-cols-3 gap-1 sm:gap-2 p-2 sm:p-3">
        ${options
          .map(({ id, name, image, monochrome }) => {
            // Options can come from an API, so their fields are escaped.
            const optionName = escapeHtml(name)
            return html`
              <li>
                <button
                  type="button"
                  data-pick="${escapeHtml(id)}"
                  title="Add ${optionName}"
                  class="group w-full m-0 flex flex-col items-center gap-1.5 rounded-xl p-2 cursor-pointer select-none hover:bg-white/5 active:scale-95 transition duration-150 ease-out focus-visible:outline-2 focus-visible:outline-white"
                >
                  <span
                    class="rounded-xl bg-white/5 group-hover:bg-white/15 p-2 transition duration-150 ease-out"
                  >
                    <img
                      src="${escapeHtml(image)}"
                      alt=""
                      draggable="false"
                      loading="lazy"
                      class="h-12 w-12 sm:h-14 sm:w-14 object-contain ${monochrome ? 'invert' : ''}"
                    />
                  </span>
                  <span
                    class="w-full text-center text-xs leading-tight font-medium text-balance wrap-break-word text-white/70 group-hover:text-white"
                  >
                    ${optionName}
                  </span>
                </button>
              </li>
            `
          })
          .join('')}
      </ul>
      <div class="sticky bottom-0 mt-auto p-3 sm:p-4 border-t border-white/10 bg-neutral-900">
        <button
          type="button"
          data-pick-all
          aria-label="Add all ${options.length}${searching ? ' matching' : ''} options to tier ${tier}"
          class="${tierColorClass(
            tier,
          )} w-full m-0 inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold text-tier-text cursor-pointer select-none hover:brightness-110 active:scale-[0.98] transition duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          ${ADD_ALL_ICON} Add all
          <span class="rounded-md bg-black/10 px-1.5 py-0.5 text-xs tabular-nums"
            >${options.length}</span
          >
        </button>
      </div>
    </div>
  `
}

/**
 * Contents of the option picker drawer (the view's `<dialog data-picker>`): a
 * header naming the tier, a search field (`data-picker-search`), the list's
 * filter checkbox if it has one (`data-picker-filter`), and every
 * option not on the list yet that matches them. Picking one (`data-pick`) adds it
 * to the tier, "Add all" (`data-pick-all`) adds every one shown, and
 * `data-picker-close` closes the drawer.
 */
export default function optionPicker({ tier, options, status, filter }: OptionPickerProps): string {
  return html`
    <div class="h-full flex flex-col">
      <header class="flex items-center gap-3 px-4 py-4 sm:px-5 border-b border-white/10">
        <span
          class="${tierColorClass(
            tier,
          )} inline-flex items-center justify-center h-11 min-w-11 px-2 rounded-xl text-2xl font-medium leading-none text-tier-text"
          >${tier}</span
        >
        <div class="flex-1 min-w-0">
          <h2 id="option-picker-title" class="m-0 text-base font-semibold">Add to tier ${tier}</h2>
          <p class="m-0 text-xs text-white/50">Pick as many as you like</p>
        </div>
        <button
          type="button"
          data-picker-close
          aria-label="Close"
          class="m-0 p-0 inline-flex items-center justify-center h-9 w-9 rounded-lg text-white/60 cursor-pointer hover:bg-white/10 hover:text-white active:scale-90 transition duration-150 ease-out focus-visible:outline-2 focus-visible:outline-white"
        >
          ${CLOSE_ICON}
        </button>
      </header>
      <div class="px-4 py-3 sm:px-5 border-b border-white/10">
        <label
          class="flex items-center gap-2 h-10 px-3 rounded-xl bg-white/5 text-white/45 focus-within:bg-white/10 focus-within:text-white/70 focus-within:outline-2 focus-within:outline-white transition duration-150 ease-out"
        >
          ${SEARCH_ICON}
          <input
            type="search"
            data-picker-search
            placeholder="Search options"
            aria-label="Search options"
            aria-controls="option-picker-items"
            autocomplete="off"
            spellcheck="false"
            enterkeyhint="done"
            class="flex-1 min-w-0 m-0 p-0 border-0 bg-transparent text-sm text-white placeholder:text-white/45 outline-none"
          />
        </label>
        ${
          filter
            ? html`
                <label
                  class="mt-3 flex items-center gap-2 text-xs font-medium text-white/70 cursor-pointer select-none hover:text-white"
                >
                  <input
                    type="checkbox"
                    data-picker-filter
                    aria-controls="option-picker-items"
                    ${filter.checked ? 'checked' : ''}
                    class="m-0 h-4 w-4 accent-brand cursor-pointer"
                  />
                  ${filter.label}
                </label>
              `
            : ''
        }
      </div>
      <div id="option-picker-items" data-picker-items class="flex-1 overflow-y-auto">
        ${optionPickerItems({ tier, options, status, filter })}
      </div>
    </div>
  `
}
