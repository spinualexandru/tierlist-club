import { ADD_OPTION_ICON, DISCARD_ICON, MINUS_ICON, PLUS_ICON, TRASH_ICON } from '../lib/icons'
import { tierColors, type TierLetter } from '../theme'
import { escapeHtml } from '../lib/render'
import type { TierOption } from '../lib/tierlist'
import { baseTierOf, isBaseTier } from '../lib/tiers'

export interface TierProps {
  /** Full tier id: a base tier plus any +/- modifiers, e.g. 'A+'. */
  id: string
  items?: TierOption[]
  /** Whether +/− can spawn (see `canSpawnTier`). */
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

/** Background class for a tier, picked by its base letter. */
export const tierColorClass = (id: string): string =>
  tierColorMap[baseTierOf(id)] ?? 'bg-neutral-600'

/** Same footprint as an option's image chip, so the ghost cells line up with the options. */
const CHIP_SIZE = 'h-18 w-18 sm:h-21.5 sm:w-21.5 md:h-22 md:w-22'

/** Ghost "+" after the options, shown while the tier is hovered; opens the option picker. */
const addOptionCell = (id: string): string => html`
  <button
    type="button"
    data-add-option="${id}"
    aria-label="Add options to tier ${id}"
    class="${CHIP_SIZE} shrink-0 m-0 p-0 inline-flex items-center justify-center rounded-xl border-2 border-dashed border-foreground/25 text-muted cursor-pointer select-none opacity-0 group-hover/tier:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100 hover:border-foreground/60 hover:bg-foreground/5 hover:text-foreground active:scale-90 transition duration-150 ease-out focus-visible:outline-2 focus-visible:outline-foreground"
  >
    ${ADD_OPTION_ICON}
  </button>
`

/**
 * Ghost trash can after the options, shown in the dragged option's tier (see
 * style.css); dropping the option on it takes it off the list.
 */
const trashCell = (): string => html`
  <div
    data-trash
    aria-hidden="true"
    class="trash-cell flex-col items-center gap-1.5 shrink-0 select-none"
  >
    <div
      class="${CHIP_SIZE} trash-chip flex items-center justify-center rounded-xl border-2 border-dashed"
    >
      ${DISCARD_ICON}
    </div>
    <span class="trash-label text-xs sm:text-sm leading-tight font-medium">Delete</span>
  </div>
`

/** A tier's color, picked by its base letter, for the rail, dot, and controls (see style.css). */
const tierColorOf = (id: string): string =>
  tierColors[baseTierOf(id) as TierLetter] ?? 'var(--color-neutral-600)'

/**
 * One of the flag's buttons, with a tooltip beside it while hovered or
 * keyboard-focused. Disabled ones keep theirs, to say why.
 */
const controlButton = (
  attribute: string,
  tooltip: string,
  icon: string,
  enabled: boolean,
): string => html`
  <button
    type="button"
    ${attribute}
    aria-label="${tooltip}"
    ${enabled ? '' : 'disabled'}
    class="group/control relative m-0 p-0 flex-1 inline-flex items-center justify-center text-black/60 select-none transition duration-150 ease-out ${
      enabled
        ? 'cursor-pointer hover:text-black active:scale-90 focus-visible:outline-2 focus-visible:outline-foreground'
        : 'cursor-not-allowed [&>svg]:opacity-40'
    }"
  >
    ${icon}
    <span
      aria-hidden="true"
      class="pointer-events-none absolute left-full top-1/2 ml-3 -translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-lg border border-foreground/10 bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground shadow-lg shadow-shade-soft opacity-0 transition duration-150 ease-out group-hover/control:opacity-100 group-hover/control:translate-x-0 group-focus-visible/control:opacity-100 group-focus-visible/control:translate-x-0"
    >
      ${tooltip}
    </span>
  </button>
`

/** Tooltip for spawning `id`'s `suffix` variant, or for why it can't be spawned (see `canSpawnTier`). */
const spawnTooltip = (id: string, suffix: '+' | '-', enabled: boolean): string => {
  const where = suffix === '+' ? 'above' : 'below'
  if (enabled) return `Add ${id}${suffix} tier ${where}`
  // A variant can't reverse its own modifier ('A+' can't spawn 'A+-'); otherwise it's there already.
  return id.includes(suffix === '+' ? '-' : '+')
    ? `Can't add a tier ${where} ${id}`
    : `${id}${suffix} already exists`
}

/**
 * The flag hanging off the rail at the tier's top, in place of its dot while
 * the tier is hovered (or keyboard-focused): + on top spawns a variant above,
 * − at the bottom one below, and the trash between them deletes the tier, for
 * spawned variants only. Stacked, it keeps the gutter narrow.
 */
const controls = (id: string, canAbove: boolean, canBelow: boolean): string => html`
  <div
    class="tier-controls absolute left-0 top-0 z-10 flex flex-col w-10 h-27 rounded-r-lg opacity-0 group-hover/tier:opacity-100 has-focus-visible:opacity-100"
  >
    ${controlButton(`data-add-above="${id}"`, spawnTooltip(id, '+', canAbove), PLUS_ICON, canAbove)}
    ${controlButton(
      `data-remove="${id}"`,
      isBaseTier(id) ? "Base tiers can't be deleted" : `Delete ${id} tier`,
      TRASH_ICON,
      !isBaseTier(id),
    )}
    ${controlButton(`data-add-below="${id}"`, spawnTooltip(id, '-', canBelow), MINUS_ICON, canBelow)}
  </div>
`

export function tier(props: TierProps): string
export function tier(app: HTMLElement, props: TierProps): string
export default function tier(appOrProps: HTMLElement | TierProps, maybeProps?: TierProps): string {
  const props = (maybeProps ?? appOrProps) as TierProps
  const items = props.items ?? []
  const canAbove = props.canSpawnAbove ?? true
  const canBelow = props.canSpawnBelow ?? true

  // The rail segment (::before), dot, and flag sit in the row's left gutter, left of the name.
  return html`
    <div
      data-tier="${props.id}"
      style="--tier-color: ${tierColorOf(props.id)}"
      class="tier-row group/tier relative grow shrink-0 flex flex-col pl-15 pb-5"
    >
      <span
        aria-hidden="true"
        class="tier-dot absolute left-8 top-2.5 h-4 w-4 rounded-full group-hover/tier:opacity-0"
      ></span>
      ${controls(props.id, canAbove, canBelow)}
      <h2 class="m-0 h-9 flex items-center text-lg font-normal leading-none select-none">
        ${props.id} Tier
      </h2>
      <div
        data-items
        class="flex-1 flex flex-wrap content-start items-start gap-3 sm:gap-4 pt-3 text-foreground"
      >
        ${items
          .map(({ id, name, image, monochrome }) => {
            // Options can come from an API, so their fields are escaped.
            const optionName = escapeHtml(name)
            // The label (w-0 min-w-full) wraps at the chip's width instead of widening the cell.
            return html`
              <div
                data-option="${escapeHtml(id)}"
                draggable="true"
                title="${optionName}"
                class="option-cell group flex flex-col items-center gap-1.5 shrink-0 hover:scale-110 transition duration-150 ease-out cursor-grab active:cursor-grabbing select-none"
              >
                <div
                  class="option-chip rounded-xl bg-chip group-hover:bg-chip-hover p-1.5 sm:p-2 transition duration-150 ease-out"
                >
                  <img
                    src="${escapeHtml(image)}"
                    alt="${optionName}"
                    draggable="false"
                    class="h-15 w-15 sm:h-17.5 sm:w-17.5 md:h-18 md:w-18 object-contain ${
                      monochrome ? 'invert' : ''
                    }"
                  />
                </div>
                <span
                  class="w-0 min-w-full text-xs sm:text-sm leading-tight font-medium text-center text-balance wrap-break-word text-foreground/70"
                >
                  ${optionName}
                </span>
              </div>
            `
          })
          .join('')}
        ${addOptionCell(props.id)} ${trashCell()}
      </div>
    </div>
  `
}
