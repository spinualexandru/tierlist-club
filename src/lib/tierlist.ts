import type { Effect } from 'effect'

/** A rankable item in a tier list, e.g. an AI harness or an AI model. */
export interface TierOption {
  /** Stable identifier, referenced from tier state — never rename once shipped. */
  id: string
  /** Human-readable name used for the label, alt text, and tooltip. */
  name: string
  /** Image URL, usually a bundled asset import. */
  image: string
  /** The image is black line art (e.g. an SVG in currentColor), so it's inverted on the dark tiers. */
  monochrome?: boolean
  /** Release date, YYYY-MM or YYYY-MM-DD, e.g. for a `pickerFilter` hiding old options. */
  released?: string
}

/** A checkbox in the option picker, on by default, that shows only the options `keep` accepts. */
export interface PickerFilter {
  label: string
  keep: (option: TierOption) => boolean
}

/** A tier list configuration: which tiers show up front, and what gets ranked. */
export interface TierList {
  /** Stable identifier, also used as the list's URL path and export file name. */
  id: string
  /** Human-readable title, e.g. 'AI models', for the page title and tooltips. */
  name: string
  /** Short name in the header's list switcher menu, e.g. 'Models'. */
  label: string
  /**
   * Tier ids shown by default, top to bottom, e.g. ['S', 'A+', 'A', 'B', 'F', 'F-'].
   * Ids without a trailing +/- are permanent; variants can be deleted.
   */
  tiers: string[]
  /**
   * The items to rank, or an Effect loading them (e.g. from an API) the first
   * time the list is opened. The list starts empty; they get added from the
   * option picker.
   */
  options: TierOption[] | Effect.Effect<TierOption[], unknown>
  pickerFilter?: PickerFilter
}

/**
 * Whether an option came out in the last `months` months, counting a
 * month-only date as the end of that month. Undated options count as recent.
 */
export const releasedWithin = (option: TierOption, months: number, now = new Date()): boolean => {
  if (!option.released) return true
  const cutoff = new Date(now)
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months)
  const released = option.released.length === 7 ? `${option.released}-31` : option.released
  return released >= cutoff.toISOString().slice(0, 10)
}

/** Lowercase, without accents, spaces, or punctuation, so "kilocode" finds "Kilo Code". */
const searchKey = (text: string): string =>
  text
    .normalize('NFD')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')

/** Options whose name or id contains `query`, in their original order; all of them for a blank query. */
export const searchOptions = (options: TierOption[], query: string): TierOption[] => {
  const key = searchKey(query)
  if (!key) return options
  return options.filter(
    (option) => searchKey(option.name).includes(key) || searchKey(option.id).includes(key),
  )
}
