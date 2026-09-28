import assert from 'node:assert/strict'
import { releasedWithin, searchOptions, type TierOption } from '../src/lib/tierlist.ts'

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

console.log('tierlist tests passed')
