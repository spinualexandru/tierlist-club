import type { TierList } from '../lib/tierlist'
import { harnesses } from './harnesses'
import { models } from './models'

/** Every available tier list. The first one is shown at `/`. */
export const tierLists: TierList[] = [harnesses, models]

export const defaultTierList = tierLists[0]

/** Where a tier list is served: `/` for the default one, `/<id>` for the rest. */
export const tierListPath = (list: TierList): string =>
  list === defaultTierList ? '/' : `/${list.id}`
