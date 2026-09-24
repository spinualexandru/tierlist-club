import type { TierList } from '../lib/tierlist'
import { harnesses } from './harnesses'

/** Every available tier list. The first one is shown at `/`. */
export const tierLists: TierList[] = [harnesses]

export const defaultTierList = tierLists[0]
