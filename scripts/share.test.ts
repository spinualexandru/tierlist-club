import assert from 'node:assert/strict'
import { decodeSelections, encodeSelections, sharePath, sharedParamsOf } from '../src/lib/share.ts'
import { initialTierState, spawnTier, addOptions } from '../src/lib/tiers.ts'

const TIERS = ['S', 'A', 'B', 'C', 'D', 'F']
const OPTIONS = ['anthropic/claude-opus-5-5', 'openai/gpt-6-sol', 'xai/grok-4.7', 'zhipuai/glm-5.3']

const b64 = (text: string) => Buffer.from(text).toString('base64url')

// --- round trip, spawned variants and empty tiers included ---
let state = spawnTier(initialTierState(TIERS), 'A', '+')
state = addOptions(state, ['openai/gpt-6-sol', 'anthropic/claude-opus-5-5'], 'S')
state = addOptions(state, ['xai/grok-4.7'], 'A+')
assert.deepEqual(decodeSelections(encodeSelections(state), TIERS, OPTIONS), state)

// --- URL-safe and unpadded, so it survives a query string untouched ---
const encoded = encodeSelections(state)
assert.match(encoded, /^[A-Za-z0-9_-]+$/)
assert.equal(
  Buffer.from(encoded, 'base64url').toString(),
  'S:openai/gpt-6-sol,anthropic/claude-opus-5-5;A+:xai/grok-4.7;A:;B:;C:;D:;F:',
)

// --- standard base64 (padded, with '+' turned into a space) decodes too ---
// 'a?>>' puts a '+' in the base64, which a query string turns into a space, and padding.
const standard = Buffer.from('S:xai/grok-4.7,a?>>;A:;B:;C:;D:;F:').toString('base64')
assert.ok(standard.includes('+') && standard.endsWith('='))
assert.deepEqual(
  decodeSelections(standard.replaceAll('+', ' '), TIERS, [...OPTIONS, 'a?>>'])?.items.S,
  ['xai/grok-4.7', 'a?>>'],
)
assert.deepEqual(
  decodeSelections(Buffer.from('S:xai/grok-4.7;A:;B:;C:;D:;F:').toString('base64'), TIERS, OPTIONS)
    ?.items.S,
  ['xai/grok-4.7'],
)

// --- share path and its query ---
const path = sharePath('models', state)
assert.ok(path.startsWith('/?type=models&selections='))
assert.deepEqual(sharedParamsOf(path.slice(1)), { type: 'models', selections: encoded })
assert.equal(sharedParamsOf('?type=models'), null)
assert.equal(sharedParamsOf('?selections=abc'), null)
assert.equal(sharedParamsOf(''), null)

// --- unknown and repeated option ids are dropped ---
assert.deepEqual(
  decodeSelections(b64('S:xai/grok-4.7,gone/model;A:xai/grok-4.7;B:;C:;D:;F:'), TIERS, OPTIONS),
  {
    order: ['S', 'A', 'B', 'C', 'D', 'F'],
    items: { S: ['xai/grok-4.7'], A: [], B: [], C: [], D: [], F: [] },
  },
)

// --- invalid selections ---
const invalid = (text: string) =>
  assert.equal(decodeSelections(b64(text), TIERS, OPTIONS), null, text)
invalid('S:gone/model;A:;B:;C:;D:;F:') // nothing known ranked
invalid('S:;A:;B:;C:;D:;F:') // nothing ranked at all
invalid('S:xai/grok-4.7;A:;B:;C:;D:') // a base tier is missing
invalid('S:xai/grok-4.7;A:;B:;C:;D:;F:;F:') // a tier twice
invalid('S:xai/grok-4.7;Z:;A:;B:;C:;D:;F:') // a tier the list doesn't have
invalid('S:xai/grok-4.7;A+-:;A:;B:;C:;D:;F:') // mixed modifiers
invalid('S:xai/grok-4.7;<b>:;A:;B:;C:;D:;F:') // markup as a tier id
invalid('S:xai/grok-4.7;constructor:;A:;B:;C:;D:;F:') // prototype keys
invalid('S xai/grok-4.7;A:;B:;C:;D:;F:') // no separator
assert.equal(decodeSelections('not base64!', TIERS, OPTIONS), null)
assert.equal(
  decodeSelections(Buffer.from([0xff, 0xfe]).toString('base64url'), TIERS, OPTIONS),
  null,
)

// --- a configured variant without its base (a list starting at 'F+') needn't be there ---
assert.deepEqual(decodeSelections(b64('S:xai/grok-4.7'), ['S', 'F+'], OPTIONS)?.order, ['S'])

console.log('share: all assertions passed')
