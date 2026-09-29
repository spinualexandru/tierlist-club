import assert from 'node:assert/strict'
import {
  initialTierState,
  unrankedOptions,
  addOptions,
  spawnTier,
  canSpawnTier,
  deleteTier,
  moveOption,
  removeOption,
  clearTier,
  isBaseTier,
  baseTierOf,
  hasRankedOptions,
} from '../src/lib/tiers.ts'

const BASE = ['S', 'A', 'B', 'C', 'D', 'F']

/** Fresh state with `optionIds` added to the first tier, in order. */
const seeded = (tiers: string[], optionIds: string[]) =>
  optionIds.reduce((state, id) => moveOption(state, id, tiers[0]), initialTierState(tiers))

// --- initial state: configured tiers in order, all empty ---
const fresh = initialTierState(BASE)
assert.deepEqual(fresh.order, BASE)
for (const id of BASE) assert.deepEqual(fresh.items[id], [])
assert.deepEqual(unrankedOptions(fresh, ['pi', 'zed']), ['pi', 'zed'])

// --- adding options: moving an unranked option places it ---
let s = seeded(BASE, ['pi', 'zed', 'claude', 'amp'])
assert.deepEqual(s.items['S'], ['pi', 'zed', 'claude', 'amp'])
assert.deepEqual(s.items['F'], [])
assert.deepEqual(unrankedOptions(s, ['amp', 'cline', 'pi', 'warp']), ['cline', 'warp'])

// --- spawn: + on A puts A+ above, - on A puts A- below ---
s = spawnTier(s, 'A', '+')
assert.deepEqual(s.order, ['S', 'A+', 'A', 'B', 'C', 'D', 'F'])
assert.deepEqual(s.items['A+'], [])
s = spawnTier(s, 'A', '-')
assert.deepEqual(s.order, ['S', 'A+', 'A', 'A-', 'B', 'C', 'D', 'F'])

// --- duplicate spawns are no-ops ---
assert.equal(spawnTier(s, 'A', '+').order.length, 8)
assert.equal(spawnTier(s, 'A', '-').order.length, 8)

// --- spawning from a variant stacks modifiers ---
s = spawnTier(s, 'A+', '+')
assert.deepEqual(s.order, ['S', 'A++', 'A+', 'A', 'A-', 'B', 'C', 'D', 'F'])

// --- a variant can't spawn the opposite modifier ('A+-' or 'A-+') ---
assert.equal(canSpawnTier(s, 'A+', '-'), false)
assert.equal(canSpawnTier(s, 'A++', '-'), false)
assert.equal(canSpawnTier(s, 'A-', '+'), false)
assert.equal(canSpawnTier(s, 'A++', '+'), true)
assert.equal(canSpawnTier(s, 'A-', '-'), true)
assert.equal(canSpawnTier(s, 'A', '+'), false) // A+ already exists
assert.equal(canSpawnTier(s, 'B', '-'), true)
assert.equal(canSpawnTier(s, 'X', '+'), false) // unknown tier
assert.equal(spawnTier(s, 'A+', '-'), s)
assert.equal(spawnTier(s, 'A-', '+'), s)

// --- move options around, including into variants ---
s = moveOption(s, 'pi', 'A+')
s = moveOption(s, 'zed', 'A-')
s = moveOption(s, 'pi', 'A')
assert.deepEqual(s.items['A+'], [])
assert.deepEqual(s.items['A'], ['pi'])
assert.deepEqual(s.items['A-'], ['zed'])
assert.ok(!s.items['S'].includes('pi'))

// --- delete folds options back into the parent tier ---
s = moveOption(s, 'zed', 'A-')
assert.deepEqual(s.items['A-'], ['zed'])
s = deleteTier(s, 'A-')
assert.deepEqual(s.order, ['S', 'A++', 'A+', 'A', 'B', 'C', 'D', 'F'])
assert.deepEqual(s.items['A'], ['pi', 'zed'])

// --- deleting a middle variant re-parents to closest surviving ancestor ---
s = deleteTier(s, 'A+') // 'A++' now orphans upward
assert.ok(!s.order.includes('A+'))
s = moveOption(s, 'claude', 'A++')
s = deleteTier(s, 'A++')
assert.deepEqual(s.items['A'], ['pi', 'zed', 'claude'])

// --- base tiers can never be deleted ---
for (const id of BASE) {
  assert.ok(isBaseTier(id))
  assert.equal(deleteTier(s, id).order.includes(id), true)
}
assert.ok(!isBaseTier('A+'))
assert.equal(baseTierOf('A+-'), 'A')

// --- state left consistent ---
assert.deepEqual(s.order, BASE)
const total = Object.values(s.items).flat().length
assert.equal(total, 4) // every option still accounted for

// --- configured lists can start with variants, extra letters, and duplicates ---
let c = seeded(['S', 'A+', 'A', 'E', 'F', 'F-', 'F-'], ['x', 'y'])
assert.deepEqual(c.order, ['S', 'A+', 'A', 'E', 'F', 'F-'])
assert.deepEqual(c.items['S'], ['x', 'y'])
assert.ok(isBaseTier('E'))
c = moveOption(moveOption(c, 'x', 'F-'), 'y', 'F-')
c = deleteTier(c, 'F-')
assert.deepEqual(c.items['F'], ['x', 'y'])
c = deleteTier(c, 'A+')
assert.deepEqual(c.order, ['S', 'A', 'E', 'F'])

// --- a variant without its base tier folds into its neighbor instead ---
let v = seeded(['S', 'A', 'F+'], ['x', 'y'])
v = moveOption(moveOption(v, 'x', 'F+'), 'y', 'F+')
assert.deepEqual(v.items['F+'], ['x', 'y'])
v = deleteTier(v, 'F+')
assert.deepEqual(v.order, ['S', 'A'])
assert.deepEqual(v.items['A'], ['x', 'y'])
v = seeded(['A-', 'B'], ['x']) // no tier above → folds into the one below
v = moveOption(v, 'x', 'A-')
v = deleteTier(v, 'A-')
assert.deepEqual(v.items['B'], ['x'])

// --- moving into another tier inserts in front of `beforeId`, leaving its neighbors in order ---
let m = seeded(['A', 'B'], ['1', '2', '3', '4', '5', '6'])
for (const id of ['4', '5', '6']) m = moveOption(m, id, 'B')
m = moveOption(m, '6', 'A', '3')
assert.deepEqual(m.items['A'], ['1', '2', '6', '3'])
assert.deepEqual(m.items['B'], ['4', '5'])
m = moveOption(m, '1', 'A', '3') // reorder within the same tier
assert.deepEqual(m.items['A'], ['2', '6', '1', '3'])
m = moveOption(m, '4', 'A', 'missing') // unknown `beforeId` appends
assert.deepEqual(m.items['A'], ['2', '6', '1', '3', '4'])
assert.equal(Object.values(m.items).flat().length, 6)

// --- the last remaining tier can't be deleted, even if it's a variant ---
const lone = seeded(['A+'], ['x'])
assert.equal(deleteTier(lone, 'A+'), lone)

// --- moving into a tier that doesn't exist is a no-op, so the option isn't lost ---
assert.equal(moveOption(lone, 'x', 'B'), lone)

// --- removing takes an option off the list, leaving the rest in order ---
let r = seeded(['A', 'B'], ['1', '2', '3'])
r = moveOption(r, '3', 'B')
r = removeOption(r, '2')
assert.deepEqual(r.items['A'], ['1'])
assert.deepEqual(r.items['B'], ['3'])
assert.deepEqual(unrankedOptions(r, ['1', '2', '3']), ['2'])
assert.equal(removeOption(r, '2'), r) // already unranked
assert.equal(removeOption(r, 'missing'), r)
r = moveOption(r, '2', 'B', '3') // and it can be added back
assert.deepEqual(r.items['B'], ['2', '3'])
assert.deepEqual(unrankedOptions(r, ['1', '2', '3']), [])

// --- clearing empties one tier and leaves the others ---
let cl = seeded(['A', 'B'], ['1', '2'])
cl = moveOption(cl, '3', 'B')
cl = clearTier(cl, 'A')
assert.deepEqual(cl.items['A'], [])
assert.deepEqual(cl.items['B'], ['3'])
assert.deepEqual(cl.order, ['A', 'B'])
assert.deepEqual(unrankedOptions(cl, ['1', '2', '3']), ['1', '2'])
assert.equal(clearTier(cl, 'A'), cl) // already empty
assert.equal(clearTier(cl, 'missing'), cl)

// --- adding several at once appends the unranked ones in order, leaving ranked ones put ---
let a = seeded(['A', 'B'], ['1'])
a = addOptions(a, ['2', '1', '3', '2'], 'B')
assert.deepEqual(a.items['A'], ['1']) // already ranked, not moved
assert.deepEqual(a.items['B'], ['2', '3']) // duplicates added once
assert.equal(addOptions(a, ['1', '2', '3'], 'A'), a) // nothing left to add
assert.equal(addOptions(a, ['4'], 'C'), a) // unknown tier
assert.deepEqual(unrankedOptions(a, ['1', '2', '3', '4']), ['4'])

// --- a list counts as started once any tier holds an option, and empty again once none does ---
let h = initialTierState(BASE)
assert.equal(hasRankedOptions(h), false)
h = addOptions(h, ['1'], 'F')
assert.equal(hasRankedOptions(h), true)
assert.equal(hasRankedOptions(removeOption(h, '1')), false)
assert.equal(hasRankedOptions({ order: ['S'], items: { X: ['1'] } }), false) // only tiers in `order` count

console.log('all tier logic tests passed ✓')
