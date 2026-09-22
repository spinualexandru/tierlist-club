import assert from 'node:assert/strict'
import {
  initialTierState,
  spawnTier,
  deleteTier,
  moveProvider,
  isMainTier,
} from '../src/lib/tiers.ts'

// --- spawn: + on A puts A+ above, - on A puts A- below ---
let s = initialTierState(['pi', 'zed', 'claude', 'amp'])
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

// --- move providers around, including into variants ---
s = moveProvider(s, 'pi', 'A+')
s = moveProvider(s, 'zed', 'A-')
s = moveProvider(s, 'pi', 'A')
assert.deepEqual(s.items['A+'], [])
assert.deepEqual(s.items['A'], ['pi'])
assert.deepEqual(s.items['A-'], ['zed'])
assert.ok(!s.items['F'].includes('pi'))

// --- delete folds providers back into the parent tier ---
s = moveProvider(s, 'zed', 'A-')
assert.deepEqual(s.items['A-'], ['zed'])
s = deleteTier(s, 'A-')
assert.deepEqual(s.order, ['S', 'A++', 'A+', 'A', 'B', 'C', 'D', 'F'])
assert.deepEqual(s.items['A'], ['pi', 'zed'])

// --- deleting a middle variant re-parents to closest surviving ancestor ---
s = deleteTier(s, 'A+') // 'A++' now orphans upward
assert.ok(!s.order.includes('A+'))
s = moveProvider(s, 'claude', 'A++')
s = deleteTier(s, 'A++')
assert.deepEqual(s.items['A'], ['pi', 'zed', 'claude'])

// --- main tiers can never be deleted ---
for (const id of ['S', 'A', 'B', 'C', 'D', 'F']) {
  assert.ok(isMainTier(id))
  assert.equal(deleteTier(s, id).order.includes(id), true)
}
assert.ok(!isMainTier('A+'))

// --- state left consistent ---
assert.deepEqual(s.order, ['S', 'A', 'B', 'C', 'D', 'F'])
const total = Object.values(s.items).flat().length
assert.equal(total, 4) // every provider still accounted for

console.log('all tier logic tests passed ✓')
