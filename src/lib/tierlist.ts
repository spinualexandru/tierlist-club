/** A rankable item in a tier list, e.g. an AI harness or an AI model. */
export interface TierOption {
  /** Stable identifier, referenced from tier state — never rename once shipped. */
  id: string
  /** Human-readable name used for the label, alt text, and tooltip. */
  name: string
  /** Image URL, usually a bundled asset import. */
  image: string
}

/** A tier list configuration: which tiers show up front, and what gets ranked. */
export interface TierList {
  /** Stable identifier, also used as the list's URL path and export file name. */
  id: string
  /** Human-readable title. */
  name: string
  /**
   * Tier ids shown by default, top to bottom, e.g. ['S', 'A+', 'A', 'B', 'F', 'F-'].
   * Ids without a trailing +/- are permanent; variants can be deleted.
   */
  tiers: string[]
  /** The items to rank. The list starts empty; they get added from the option picker. */
  options: TierOption[]
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
