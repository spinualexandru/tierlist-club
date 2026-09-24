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
   * Every option starts in the first tier.
   */
  tiers: string[]
  /** The items to rank. */
  options: TierOption[]
}
