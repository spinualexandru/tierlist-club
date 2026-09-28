import assert from 'node:assert/strict'
import { decodeSelections, encodeSelections, sharePath, sharedParamsOf } from '../src/lib/share.ts'
import { addOptions, initialTierState, spawnTier, type TierState } from '../src/lib/tiers.ts'

const TIERS = ['S', 'A', 'B', 'C', 'D', 'F']
const OPTIONS = [
  'anthropic/claude-opus-5-5',
  'anthropic/claude-fable-5-1',
  'openai/gpt-6-astra',
  'openai/gpt-6-sol',
  'openai/gpt-6-luna',
  'xai/grok-4.7',
  'meta/muse-spark-1.3',
  'zhipuai/glm-5.3',
]

const bytesOf = (selections: string) => [...Buffer.from(selections, 'base64url')]
const selectionsOf = (bytes: number[]) => Buffer.from(bytes).toString('base64url')
const roundTrip = (state: TierState, tiers = TIERS, options = OPTIONS) =>
  decodeSelections(encodeSelections(state, tiers, options), tiers, options)

// --- round trip on the configured tiers ---
const ranked = addOptions(
  addOptions(initialTierState(TIERS), ['openai/gpt-6-sol', 'anthropic/claude-opus-5-5'], 'S'),
  ['xai/grok-4.7'],
  'C',
)
assert.deepEqual(roundTrip(ranked), ranked)

// --- round trip with spawned variants, stacked modifiers included ---
let spawned = spawnTier(spawnTier(spawnTier(ranked, 'A', '+'), 'A+', '+'), 'F', '-')
spawned = addOptions(spawned, ['zhipuai/glm-5.3'], 'A++')
spawned = addOptions(spawned, ['meta/muse-spark-1.3'], 'F-')
assert.deepEqual(roundTrip(spawned), spawned)

// --- compact: URL-safe, a 3-byte hash per option, and no tier codes for the configured tiers ---
const encoded = encodeSelections(ranked, TIERS, OPTIONS)
assert.match(encoded, /^[A-Za-z0-9_-]+$/)
// header, tier count 0, then S: 2 options, A, B: none, C: 1, D, F: none
assert.equal(bytesOf(encoded).length, 1 + 1 + 6 + 3 * 3)
assert.equal(bytesOf(encoded)[0], 0x13) // version 1, 3-byte hashes
assert.equal(bytesOf(encoded)[1], 0) // the configured tiers
// spawned tiers: a one-byte code per tier
assert.equal(bytesOf(encodeSelections(spawned, TIERS, OPTIONS))[1], 9)

// --- links keep working while options come and go ---
const newer = ['new/model-a', ...OPTIONS.filter((id) => id !== 'openai/gpt-6-sol'), 'new/model-b']
assert.deepEqual(decodeSelections(encoded, TIERS, newer)?.items.S, ['anthropic/claude-opus-5-5'])
assert.deepEqual(decodeSelections(encoded, TIERS, newer)?.items.C, ['xai/grok-4.7'])

// --- standard base64 (padded, with '+' turned into a space by a query string) decodes too ---
const standard = Buffer.from(bytesOf(encoded)).toString('base64')
assert.deepEqual(decodeSelections(standard.replaceAll('+', ' '), TIERS, OPTIONS), ranked)

// --- share path and its query ---
const path = sharePath('models', encoded)
assert.equal(path, `/?type=models&selections=${encoded}`)
assert.deepEqual(sharedParamsOf(path.slice(1)), { type: 'models', selections: encoded })
assert.equal(sharedParamsOf('?type=models'), null)
assert.equal(sharedParamsOf('?selections=abc'), null)
assert.equal(sharedParamsOf(''), null)

// --- hashes: longer ones for ranked options that share their 3-byte hash with another ---
const hash3 = (id: string) => {
  const state = addOptions(initialTierState(['S']), [id], 'S')
  return selectionsOf(bytesOf(encodeSelections(state, ['S'], [id])).slice(3))
}
const seen = new Map<string, string>()
let collision: [string, string] | undefined
for (let i = 0; !collision; i++) {
  const id = `model-${i}`
  const other = seen.get(hash3(id))
  if (other) collision = [other, id]
  seen.set(hash3(id), id)
}
const [first, second] = collision
const colliding = addOptions(initialTierState(TIERS), [first], 'S')
const longer = encodeSelections(colliding, TIERS, [...OPTIONS, first, second])
assert.equal(bytesOf(longer)[0], 0x14) // 4-byte hashes
assert.deepEqual(decodeSelections(longer, TIERS, [...OPTIONS, first, second]), colliding)
// a colliding option added after the link was made makes its hash ambiguous: dropped
const before = encodeSelections(addOptions(colliding, ['xai/grok-4.7'], 'A'), TIERS, OPTIONS)
assert.equal(bytesOf(before)[0], 0x13)
assert.deepEqual(decodeSelections(before, TIERS, [...OPTIONS, first, second])?.items, {
  S: [],
  A: ['xai/grok-4.7'],
  B: [],
  C: [],
  D: [],
  F: [],
})

// --- repeated option hashes after the first are dropped ---
const [, , ...rest] = bytesOf(encoded)
const sHash = rest.slice(1, 4)
const repeated = [0x13, 0, 1, ...sHash, 1, ...sHash, 0, 0, 0, 0]
assert.deepEqual(decodeSelections(selectionsOf(repeated), TIERS, OPTIONS)?.items.A, [])

// --- invalid selections ---
const invalid = (bytes: number[], why: string) =>
  assert.equal(decodeSelections(selectionsOf(bytes), TIERS, OPTIONS), null, why)
const hash = sHash
invalid([0x23, 0, 1, ...hash, 0, 0, 0, 0, 0], 'unknown version')
invalid([0x12, 0, 1, ...hash.slice(0, 2), 0, 0, 0, 0, 0], 'hashes too short')
invalid([0x13, 0, 1, ...hash, 0, 0, 0, 0], 'truncated')
invalid([0x13, 0, 1, ...hash, 0, 0, 0, 0, 0, 0], 'bytes left over')
invalid([0x13, 0, 0, 0, 0, 0, 0, 0], 'nothing ranked')
invalid([0x13, 0, 1, 1, 2, 3, 0, 0, 0, 0, 0], 'no known option ranked')
invalid([0x13, 5, 0, 1, 2, 3, 4, 1, ...hash, 0, 0, 0, 0], 'a base tier missing')
invalid([0x13, 7, 0, 1, 2, 3, 4, 5, 5, 1, ...hash, 0, 0, 0, 0, 0, 0], 'a tier twice')
invalid([0x13, 7, 0, 6, 1, 2, 3, 4, 5, 1, ...hash, 0, 0, 0, 0, 0, 0], "a '-' without a modifier")
invalid([0x13, 7, 0, 0xff, 0x7f, 1, 2, 3, 4, 5, 1, ...hash, 0, 0, 0, 0, 0, 0], 'too many modifiers')
invalid([0x13, 0xff, 0xff, 0xff, 0xff, 0x0f], 'varint too long')
invalid([0x13, 0xff, 0xff, 0xff, 0x7f], 'a huge tier count')
assert.equal(decodeSelections('not base64!', TIERS, OPTIONS), null)

// --- a configured variant without its base (a list starting at 'F+') needn't be there ---
const partial = addOptions(initialTierState(['S', 'F+']), ['xai/grok-4.7'], 'S')
assert.deepEqual(roundTrip(partial, ['S', 'F+']), partial)

console.log('share: all assertions passed')
