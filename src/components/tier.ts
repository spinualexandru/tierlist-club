import { MINUS_ICON, PLUS_ICON, TRASH_ICON } from '../lib/icons'
import type { TierOption } from '../lib/tierlist'
import { baseTierOf, isBaseTier } from '../lib/tiers'

export interface TierProps {
  /** Full tier id: a base tier plus any +/- modifiers, e.g. 'A+'. */
  id: string
  items?: TierOption[]
  /** Whether +/− can spawn (false when that variant already exists). */
  canSpawnAbove?: boolean
  canSpawnBelow?: boolean
}

const tierColorMap: Record<string, string> = {
  S: 'bg-tier-s',
  A: 'bg-tier-a',
  B: 'bg-tier-b',
  C: 'bg-tier-c',
  D: 'bg-tier-d',
  E: 'bg-tier-e',
  F: 'bg-tier-f',
}

/** Hidden until the tier block is hovered (or keyboard-focused). */
const CONTROL_HIDDEN = 'opacity-0 transition duration-150 ease-out'

/**
 * From md up the controls float at the top/bottom edge of the letter block, so
 * the row height follows the letter and the options rather than the controls.
 */
const CONTROL_POSITION = {
  above: 'md:absolute md:top-1.5 md:left-1/2 md:-translate-x-1/2',
  below: 'md:absolute md:bottom-1.5 md:left-1/2 md:-translate-x-1/2',
} as const

const spawnControl = (
  id: string,
  direction: 'above' | 'below',
  icon: string,
  enabled: boolean,
): string => html`
  <button
    type="button"
    data-add-${direction}="${id}"
    aria-label="Add tier ${direction}"
    ${enabled ? '' : 'disabled'}
    class="${CONTROL_POSITION[direction]} m-0 p-0 inline-flex items-center justify-center h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 rounded-full text-tier-text select-none ${CONTROL_HIDDEN} ${
      enabled
        ? 'cursor-pointer group-hover:opacity-100 focus-visible:opacity-100 enabled:hover:bg-black/10 enabled:active:scale-90'
        : 'cursor-not-allowed group-hover:opacity-30'
    }"
  >
    ${icon}
  </button>
`

/** The letter itself — or, for deletable variants, a trash icon on hover. */
const letterSlot = (id: string): string => {
  const letter = html`
    <span
      class="m-0 p-0 leading-none ${
        !isBaseTier(id) ? 'transition-opacity duration-150 group-hover:opacity-0' : ''
      }"
      >${id}</span
    >
  `
  if (isBaseTier(id)) return letter

  return html`
    <span class="relative inline-flex items-center justify-center">
      ${letter}
      <button
        type="button"
        data-remove="${id}"
        aria-label="Delete tier"
        class="m-0 p-0 absolute inset-0 inline-flex items-center justify-center text-tier-text cursor-pointer select-none active:scale-90 ${CONTROL_HIDDEN} group-hover:opacity-100 focus-visible:opacity-100"
      >
        ${TRASH_ICON}
      </button>
    </span>
  `
}

export function tier(props: TierProps): string
export function tier(app: HTMLElement, props: TierProps): string
export default function tier(appOrProps: HTMLElement | TierProps, maybeProps?: TierProps): string {
  const props = (maybeProps ?? appOrProps) as TierProps
  const colorClass = tierColorMap[baseTierOf(props.id)] ?? 'bg-neutral-600'
  const items = props.items ?? []
  const canAbove = props.canSpawnAbove ?? true
  const canBelow = props.canSpawnBelow ?? true

  return html`
    <div
      data-tier="${props.id}"
      class="tier-row grow shrink-0 min-h-[216px] sm:min-h-[240px] md:min-h-28 flex md:flex-row flex-col sm:flex-col items-stretch w-full overflow-hidden"
    >
      <div
        class="group relative w-full sm:w-full md:w-42 lg:w-46 md:h-full shrink-0 flex flex-col items-center justify-center gap-1 sm:gap-1.5 md:gap-0 p-2 sm:p-4 md:px-6 md:py-3 text-3xl sm:text-5xl md:text-[clamp(3rem,8vh,6rem)] font-medium leading-none select-none text-tier-text ${colorClass}"
      >
        ${spawnControl(props.id, 'above', PLUS_ICON, canAbove)} ${letterSlot(props.id)}
        ${spawnControl(props.id, 'below', MINUS_ICON, canBelow)}
      </div>
      <div
        data-items
        class="md:flex-1 flex flex-wrap content-center items-center gap-3 sm:gap-4 px-3 sm:px-6 py-3 text-white"
      >
        ${items
          .map(
            (option) => html`
              <div
                data-option="${option.id}"
                draggable="true"
                title="${option.name}"
                class="option-cell group flex flex-col items-center gap-1.5 shrink-0 hover:scale-110 transition duration-150 ease-out cursor-grab active:cursor-grabbing select-none"
              >
                <div
                  class="option-chip rounded-xl bg-white/5 group-hover:bg-white/15 p-1.5 sm:p-2 transition duration-150 ease-out"
                >
                  <img
                    src="${option.image}"
                    alt="${option.name}"
                    draggable="false"
                    class="h-15 w-15 sm:h-17.5 sm:w-17.5 md:h-18 md:w-18 object-contain"
                  />
                </div>
                <span
                  class="text-xs sm:text-sm leading-tight font-medium text-center text-white/70"
                >
                  ${option.name}
                </span>
              </div>
            `,
          )
          .join('')}
      </div>
    </div>
  `
}
