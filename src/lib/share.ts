import { baseTierOf, isBaseTier, type TierState } from './tiers.ts'

/*
 * A shared tier list travels in its URL: `/?type=<list id>&selections=<base64>`,
 * where the base64 (URL-safe, unpadded) holds each tier in order with the ids
 * of its options, e.g. `S:a,b;A+:;A:c` — empty tiers included, so spawned
 * variants come along too.
 */

/** Query parameter naming the shared tier list. */
export const SHARE_TYPE_PARAM = 'type'
/** Query parameter holding the shared tiers and their options. */
export const SHARE_SELECTIONS_PARAM = 'selections'

const TIER_SEPARATOR = ';'
const ITEMS_SEPARATOR = ':'
const ID_SEPARATOR = ','

/** A tier id: a base without modifiers or separators, then only `+`s or only `-`s. */
const TIER_ID = /^[^+\-:;,\s]+(?:\++|-+)?$/

const toBase64Url = (text: string): string => {
  const binary = Array.from(new TextEncoder().encode(text), (byte) =>
    String.fromCharCode(byte),
  ).join('')
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

/** Decodes URL-safe or standard base64, padded or not; null if it isn't valid UTF-8 base64. */
const fromBase64Url = (encoded: string): string | null => {
  try {
    // A standard '+' that went through a query string unescaped comes back as a space.
    const base64 = encoded.trim().replaceAll(' ', '+').replaceAll('-', '+').replaceAll('_', '/')
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return null
  }
}

/** The `selections` value for a tier state. */
export const encodeSelections = (state: TierState): string =>
  toBase64Url(
    state.order
      .map(
        (tierId) => `${tierId}${ITEMS_SEPARATOR}${(state.items[tierId] ?? []).join(ID_SEPARATOR)}`,
      )
      .join(TIER_SEPARATOR),
  )

/** The path and query a tier list's state is shared at, e.g. `/?type=models&selections=…`. */
export const sharePath = (listId: string, state: TierState): string =>
  `/?${new URLSearchParams({
    [SHARE_TYPE_PARAM]: listId,
    [SHARE_SELECTIONS_PARAM]: encodeSelections(state),
  })}`

/** The list id and selections of a shared tier list's query string, if it has both. */
export const sharedParamsOf = (search: string): { type: string; selections: string } | null => {
  const params = new URLSearchParams(search)
  const type = params.get(SHARE_TYPE_PARAM)
  const selections = params.get(SHARE_SELECTIONS_PARAM)
  return type && selections ? { type, selections } : null
}

/**
 * The tier state a `selections` value describes, for a list with the given
 * configured `tiers` and `optionIds`. Null unless it's valid: every tier is
 * a variant of one of the list's base tiers, none twice, its configured base
 * tiers are all there (they can't be deleted), and at least one known option
 * is ranked.
 * Unknown option ids (e.g. a model that's gone since) are dropped, as are
 * repeats of an id after its first.
 */
export const decodeSelections = (
  selections: string,
  tiers: string[],
  optionIds: string[],
): TierState | null => {
  const text = fromBase64Url(selections)
  if (!text) return null

  const bases = new Set(tiers.map(baseTierOf))
  const required = tiers.filter(isBaseTier)
  const known = new Set(optionIds)
  const placed = new Set<string>()
  const order: string[] = []
  const items: Record<string, string[]> = {}

  for (const entry of text.split(TIER_SEPARATOR)) {
    const at = entry.indexOf(ITEMS_SEPARATOR)
    if (at === -1) return null
    const tierId = entry.slice(0, at)
    if (!TIER_ID.test(tierId) || !bases.has(baseTierOf(tierId)) || Object.hasOwn(items, tierId))
      return null
    order.push(tierId)
    items[tierId] = []
    for (const id of entry.slice(at + 1).split(ID_SEPARATOR)) {
      if (!known.has(id) || placed.has(id)) continue
      placed.add(id)
      items[tierId].push(id)
    }
  }

  if (!required.every((base) => Object.hasOwn(items, base))) return null
  if (placed.size === 0) return null
  return { order, items }
}
