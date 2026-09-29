export interface TierState {
  /** Tier ids in display order, e.g. ['S', 'A+', 'A', 'A-', 'B', …]. */
  order: string[]
  /** Option ids per tier id. */
  items: Record<string, string[]>
}

/** Trailing +/- modifiers of a tier id ('A+-' → '+-'). */
const MODIFIERS = /[+-]+$/

/** Base tier of an id ('A+' → 'A'), which picks its color. */
export const baseTierOf = (id: string): string => id.replace(MODIFIERS, '')

/** Base tiers (no +/- modifier) are permanent; spawned variants can be deleted. */
export const isBaseTier = (id: string): boolean => id === baseTierOf(id)

/** Fresh state: the given tiers, all empty — options get added one by one. */
export const initialTierState = (tiers: string[]): TierState => {
  const order = [...new Set(tiers)]
  return {
    order,
    items: Object.fromEntries(order.map((id) => [id, []])),
  }
}

/** Option ids from `optionIds` that aren't in any tier yet, in the given order. */
export const unrankedOptions = (state: TierState, optionIds: string[]): string[] => {
  const ranked = new Set(state.order.flatMap((tierId) => state.items[tierId] ?? []))
  return optionIds.filter((id) => !ranked.has(id))
}

/** Whether any tier holds an option, e.g. to tell a list that's been started from an empty one. */
export const hasRankedOptions = (state: TierState): boolean =>
  state.order.some((tierId) => (state.items[tierId]?.length ?? 0) > 0)

/**
 * Move an option to a tier, removing it from any other — or add it, if it
 * isn't in one yet. When `beforeId` is given the option is inserted in front
 * of it, otherwise it is appended. Unknown tiers are a no-op, so the option
 * is never lost.
 */
export const moveOption = (
  state: TierState,
  id: string,
  to: string,
  beforeId?: string,
): TierState => {
  if (!state.order.includes(to)) return state
  return {
    order: state.order,
    items: Object.fromEntries(
      state.order.map((tierId) => {
        const rest = (state.items[tierId] ?? []).filter((item) => item !== id)
        if (tierId !== to) return [tierId, rest] as const
        const at = beforeId ? rest.indexOf(beforeId) : -1
        if (at === -1) return [tierId, [...rest, id]] as const
        return [tierId, [...rest.slice(0, at), id, ...rest.slice(at)]] as const
      }),
    ),
  }
}

/**
 * Append options that aren't in any tier yet to `to`, in the given order.
 * Ones that are already ranked stay where they are; unknown tiers are a no-op.
 */
export const addOptions = (state: TierState, ids: string[], to: string): TierState => {
  const fresh = unrankedOptions(state, [...new Set(ids)])
  if (!state.order.includes(to) || fresh.length === 0) return state
  return {
    order: state.order,
    items: { ...state.items, [to]: [...(state.items[to] ?? []), ...fresh] },
  }
}

/** Take an option off the list, making it unranked again. A no-op if it isn't in a tier. */
export const removeOption = (state: TierState, id: string): TierState => {
  if (!state.order.some((tierId) => state.items[tierId]?.includes(id))) return state
  return {
    order: state.order,
    items: Object.fromEntries(
      state.order.map((tierId) => [
        tierId,
        (state.items[tierId] ?? []).filter((item) => item !== id),
      ]),
    ),
  }
}

/** Take every option off a tier, making them unranked again. A no-op if the tier is empty or unknown. */
export const clearTier = (state: TierState, tierId: string): TierState => {
  if (!state.items[tierId]?.length) return state
  return { order: state.order, items: { ...state.items, [tierId]: [] } }
}

/**
 * Whether `tierId` can spawn a `suffix` variant: it exists, the variant doesn't
 * yet, and the suffix doesn't reverse a modifier it already has ('A+' can't
 * spawn 'A+-', nor 'A-' spawn 'A-+').
 */
export const canSpawnTier = (state: TierState, tierId: string, suffix: '+' | '-'): boolean =>
  state.order.includes(tierId) &&
  !state.order.includes(`${tierId}${suffix}`) &&
  !tierId.includes(suffix === '+' ? '-' : '+')

/** Spawn a `tierId`+`suffix` tier directly above ('+') or below ('-') it. */
export const spawnTier = (state: TierState, tierId: string, suffix: '+' | '-'): TierState => {
  const newId = `${tierId}${suffix}`
  if (!canSpawnTier(state, tierId, suffix)) return state
  const at = state.order.indexOf(tierId) + (suffix === '-' ? 1 : 0)
  return {
    order: [...state.order.slice(0, at), newId, ...state.order.slice(at)],
    items: { ...state.items, [newId]: [] },
  }
}

/** A tier's closest ancestor in `order`, taking off one modifier at a time ('A++' → 'A+' → 'A'). */
const ancestorIn = (order: string[], tierId: string): string | undefined => {
  const base = baseTierOf(tierId)
  for (let parent = tierId.slice(0, -1); parent.length >= base.length; parent = parent.slice(0, -1))
    if (order.includes(parent)) return parent
  return undefined
}

/**
 * Add a variant tier like 'A+' or 'B--' right above ('+') or below ('-') its
 * closest ancestor, e.g. 'A++' above 'A' when there's no 'A+'. A no-op if
 * it's there already, isn't a variant, mixes + and -, or has no ancestor.
 */
export const addTier = (state: TierState, tierId: string): TierState => {
  const modifiers = tierId.slice(baseTierOf(tierId).length)
  if (!modifiers || state.order.includes(tierId) || /\+-|-\+/.test(modifiers)) return state
  const ancestor = ancestorIn(state.order, tierId)
  if (!ancestor) return state
  const at = state.order.indexOf(ancestor) + (modifiers.startsWith('-') ? 1 : 0)
  return {
    order: [...state.order.slice(0, at), tierId, ...state.order.slice(at)],
    items: { ...state.items, [tierId]: [] },
  }
}

/**
 * Where a deleted tier's options go: its closest surviving ancestor, else the
 * neighboring tier above or below — a configured variant like 'F+' may have
 * no base 'F' to fall back to.
 */
const foldTargetOf = (order: string[], tierId: string): string | undefined => {
  const at = order.indexOf(tierId)
  return ancestorIn(order, tierId) ?? order[at - 1] ?? order[at + 1]
}

/** Delete a variant tier, folding its options into the tier from `foldTargetOf`. */
export const deleteTier = (state: TierState, tierId: string): TierState => {
  if (isBaseTier(tierId) || !state.order.includes(tierId)) return state
  const target = foldTargetOf(state.order, tierId)
  if (!target) return state // the only tier left — its options have nowhere to go
  const items = { ...state.items }
  delete items[tierId]
  items[target] = [...(items[target] ?? []), ...(state.items[tierId] ?? [])]
  return {
    order: state.order.filter((id) => id !== tierId),
    items,
  }
}
