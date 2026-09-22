/** The six base tiers — always present and impossible to delete. */
export const MAIN_TIERS = ['S', 'A', 'B', 'C', 'D', 'F'] as const

export interface TierState {
  /** Tier ids in display order, e.g. ['S', 'A+', 'A', 'A-', 'B', …]. */
  order: string[]
  /** Provider ids per tier id. */
  items: Record<string, string[]>
}

/** Fresh state: the six base tiers, with every provider starting in F. */
export const initialTierState = (providerIds: string[]): TierState => ({
  order: [...MAIN_TIERS],
  items: Object.fromEntries(
    MAIN_TIERS.map((letter) => [letter, letter === 'F' ? [...providerIds] : []] as const),
  ),
})

export const isMainTier = (id: string): boolean => (MAIN_TIERS as readonly string[]).includes(id)

/**
 * Move a provider to a tier, removing it from any other. When `beforeId` is
 * given the provider is inserted in front of it, otherwise it is appended.
 */
export const moveProvider = (
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

/** Delete a spawned tier, folding its providers into its closest surviving parent. */
export const deleteTier = (state: TierState, tierId: string): TierState => {
  if (isMainTier(tierId) || !state.order.includes(tierId)) return state
  const orphaned = state.items[tierId] ?? []
  // Walk up one modifier at a time — always resolves to a base tier in the end.
  let parent = tierId.slice(0, -1)
  while (parent && !state.order.includes(parent)) parent = parent.slice(0, -1)
  const items = { ...state.items }
  delete items[tierId]
  if (parent) items[parent] = [...(items[parent] ?? []), ...orphaned]
  return {
    order: state.order.filter((id) => id !== tierId),
    items,
  }
}
