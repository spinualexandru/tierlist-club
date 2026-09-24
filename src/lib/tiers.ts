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

/** Fresh state: the given tiers, with every option starting in the first (top) one. */
export const initialTierState = (tiers: string[], optionIds: string[]): TierState => {
  const order = [...new Set(tiers)]
  const first = order[0]
  return {
    order,
    items: Object.fromEntries(order.map((id) => [id, id === first ? [...optionIds] : []] as const)),
  }
}

/**
 * Move an option to a tier, removing it from any other. When `beforeId` is
 * given the option is inserted in front of it, otherwise it is appended.
 */
export const moveOption = (
  state: TierState,
  id: string,
  to: string,
  beforeId?: string,
): TierState => ({
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
})

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
