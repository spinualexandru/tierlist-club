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

/** Spawn a `tierId`+`suffix` tier directly above ('+') or below ('-') it. */
export const spawnTier = (state: TierState, tierId: string, suffix: '+' | '-'): TierState => {
  const newId = `${tierId}${suffix}`
  if (!state.order.includes(tierId) || state.order.includes(newId)) return state
  const at = state.order.indexOf(tierId) + (suffix === '-' ? 1 : 0)
  return {
    order: [...state.order.slice(0, at), newId, ...state.order.slice(at)],
    items: { ...state.items, [newId]: [] },
  }
}

/**
 * Where a deleted tier's options go: its closest surviving ancestor (walking
 * up one modifier at a time), else the neighboring tier above or below — a
 * configured variant like 'F+' may have no base 'F' to fall back to.
 */
const foldTargetOf = (order: string[], tierId: string): string | undefined => {
  let parent = tierId.slice(0, -1)
  while (parent && !order.includes(parent)) parent = parent.slice(0, -1)
  if (parent) return parent
  const at = order.indexOf(tierId)
  return order[at - 1] ?? order[at + 1]
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
