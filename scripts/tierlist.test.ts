import assert from 'node:assert/strict'
import { matchOption, releasedWithin, searchOptions, type TierOption } from '../src/lib/tierlist.ts'

const option = (id: string, name: string): TierOption => ({ id, name, image: '' })
const OPTIONS = [
  option('claude-code', 'Claude Code'),
  option('kilo-code', 'Kilo Code'),
  option('github-copilot', 'GitHub Copilot'),
  option('zed', 'Zéd'),
]
const ids = (query: string) => searchOptions(OPTIONS, query).map((o) => o.id)

// --- blank queries keep every option, in order ---
assert.deepEqual(ids(''), ['claude-code', 'kilo-code', 'github-copilot', 'zed'])
assert.deepEqual(ids('   '), ids(''))

// --- substring, case-insensitive, in original order ---
assert.deepEqual(ids('code'), ['claude-code', 'kilo-code'])
assert.deepEqual(ids('COPI'), ['github-copilot'])

// --- spaces, punctuation, and accents are ignored ---
assert.deepEqual(ids('kilocode'), ['kilo-code'])
assert.deepEqual(ids('kilo-code'), ['kilo-code'])
assert.deepEqual(ids('zed'), ['zed'])

// --- no match ---
assert.deepEqual(ids('cursor'), [])

// --- releasedWithin: the last N months, month-only dates as the month's end ---
const NOW = new Date('2026-09-28T12:00:00Z')
const released = (date?: string) => releasedWithin({ ...option('x', 'X'), released: date }, 12, NOW)
assert.equal(released('2026-09-01'), true)
assert.equal(released('2025-09-28'), true) // exactly a year ago
assert.equal(released('2025-09-27'), false)
assert.equal(released('2025-09'), true) // could be as late as 2025-09-30
assert.equal(released('2025-08'), false)
assert.equal(released(undefined), true) // undated counts as recent

// --- matchOption: an exact id, else an id or name ignoring case and punctuation, else a unique substring ---
const matched = (ref: string) => {
  const match = matchOption(OPTIONS, ref)
  return 'option' in match ? match.option.id : match.candidates.map((o) => o.id)
}
assert.equal(matched('kilo-code'), 'kilo-code')
assert.equal(matched('Claude Code'), 'claude-code')
assert.equal(matched('github copilot'), 'github-copilot')
assert.equal(matched('ZED'), 'zed')
assert.equal(matched('copilot'), 'github-copilot') // the only one containing it
assert.deepEqual(matched('code'), ['claude-code', 'kilo-code']) // ambiguous
assert.deepEqual(matched('cursor'), [])
assert.deepEqual(matched(' - '), []) // nothing to match on, not everything
// An exact name wins over options that merely contain it.
const codex = [option('codex', 'Codex'), option('codex-mini', 'Codex Mini')]
assert.deepEqual(matchOption(codex, 'CODEX'), { option: codex[0] })

console.log('tierlist tests passed')
