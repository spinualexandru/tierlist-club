import { ADD_ALL_ICON, CLOSE_ICON } from '../lib/icons'
import type { TierOption } from '../lib/tierlist'
import { tierColorClass } from './tier'

export interface OptionPickerProps {
  /** Tier id the picked options get added to. */
  tier: string
  /** Options that aren't on the list yet. */
  options: TierOption[]
}

/**
 * The picker's option grid with an "Add all" footer (`data-pick-all`), or a
 * note once everything is on the list. The view re-renders just this into
 * `data-picker-items` after each pick, so the grid keeps its scroll position.
 */
export const optionPickerItems = ({ tier, options }: OptionPickerProps): string => {
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
          .map(
            (option) => html`
              <li>
                <button
                  type="button"
                  data-pick="${option.id}"
                  title="Add ${option.name}"
                  class="group w-full m-0 flex flex-col items-center gap-1.5 rounded-xl p-2 cursor-pointer select-none hover:bg-white/5 active:scale-95 transition duration-150 ease-out focus-visible:outline-2 focus-visible:outline-white"
                >
                  <span
                    class="rounded-xl bg-white/5 group-hover:bg-white/15 p-2 transition duration-150 ease-out"
                  >
                    <img
                      src="${option.image}"
                      alt=""
                      draggable="false"
                      class="h-12 w-12 sm:h-14 sm:w-14 object-contain"
                    />
                  </span>
                  <span
                    class="w-full truncate text-center text-xs font-medium text-white/70 group-hover:text-white"
                  >
                    ${option.name}
                  </span>
                </button>
              </li>
            `,
          )
          .join('')}
      </ul>
      <div class="sticky bottom-0 mt-auto p-3 sm:p-4 border-t border-white/10 bg-neutral-900">
        <button
          type="button"
          data-pick-all
          aria-label="Add all ${options.length} options to tier ${tier}"
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
 * header naming the tier, and every option not on the list yet. Picking one
 * (`data-pick`) adds it to the tier, "Add all" (`data-pick-all`) adds every
 * one of them, and `data-picker-close` closes the drawer.
 */
export default function optionPicker({ tier, options }: OptionPickerProps): string {
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
      <div data-picker-items class="flex-1 overflow-y-auto">
        ${optionPickerItems({ tier, options })}
      </div>
    </div>
  `
}
