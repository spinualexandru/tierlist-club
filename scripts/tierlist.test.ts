import assert from 'node:assert/strict'
import { searchOptions, type TierOption } from '../src/lib/tierlist.ts'

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

console.log('tierlist tests passed')
