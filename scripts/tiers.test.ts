import assert from 'node:assert/strict'
import {
  initialTierState,
  spawnTier,
  deleteTier,
  moveOption,
  isBaseTier,
  baseTierOf,
} from '../src/lib/tiers.ts'

const BASE = ['S', 'A', 'B', 'C', 'D', 'F']

// --- initial state: configured tiers in order, every option in the first one ---
let s = initialTierState(BASE, ['pi', 'zed', 'claude', 'amp'])
assert.deepEqual(s.order, BASE)
assert.deepEqual(s.items['S'], ['pi', 'zed', 'claude', 'amp'])
assert.deepEqual(s.items['F'], [])

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
let c = initialTierState(['S', 'A+', 'A', 'E', 'F', 'F-', 'F-'], ['x', 'y'])
assert.deepEqual(c.order, ['S', 'A+', 'A', 'E', 'F', 'F-'])
assert.deepEqual(c.items['S'], ['x', 'y']) // options start in the first tier
assert.ok(isBaseTier('E'))
c = moveOption(moveOption(c, 'x', 'F-'), 'y', 'F-')
c = deleteTier(c, 'F-')
assert.deepEqual(c.items['F'], ['x', 'y'])
c = deleteTier(c, 'A+')
assert.deepEqual(c.order, ['S', 'A', 'E', 'F'])

// --- a variant without its base tier folds into its neighbor instead ---
let v = initialTierState(['S', 'A', 'F+'], ['x', 'y'])
v = moveOption(moveOption(v, 'x', 'F+'), 'y', 'F+')
assert.deepEqual(v.items['F+'], ['x', 'y'])
v = deleteTier(v, 'F+')
assert.deepEqual(v.order, ['S', 'A'])
assert.deepEqual(v.items['A'], ['x', 'y'])
v = initialTierState(['A-', 'B'], ['x']) // no tier above → folds into the one below
v = moveOption(v, 'x', 'A-')
v = deleteTier(v, 'A-')
assert.deepEqual(v.items['B'], ['x'])

// --- moving into another tier inserts in front of `beforeId`, leaving its neighbors in order ---
let m = initialTierState(['A', 'B'], ['1', '2', '3', '4', '5', '6'])
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
const lone = initialTierState(['A+'], ['x'])
assert.equal(deleteTier(lone, 'A+'), lone)

console.log('all tier logic tests passed ✓')
