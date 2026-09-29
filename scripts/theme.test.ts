import assert from 'node:assert/strict'
import { nextThemeMode, parseThemeMode, themeLabel, THEME_MODES } from '../src/lib/theme.ts'

// Only the three modes are read back; anything else (nothing saved, a stale or tampered value) is 'system'.
for (const mode of THEME_MODES) assert.equal(parseThemeMode(mode), mode)
for (const value of [null, undefined, '', 'auto', 'Light', 'DARK', 0, {}])
  assert.equal(parseThemeMode(value), 'system')

// Following the system, a click pins the opposite theme, so it always changes the page...
assert.equal(nextThemeMode('system', true), 'light')
assert.equal(nextThemeMode('system', false), 'dark')
// ...and a pinned theme goes back to following the system, whatever the system's setting is.
for (const systemDark of [true, false]) {
  assert.equal(nextThemeMode('light', systemDark), 'system')
  assert.equal(nextThemeMode('dark', systemDark), 'system')
}

// The label names the current mode and where a click leads.
assert.equal(themeLabel('system', false), 'Theme: System. Switch to Dark')
assert.equal(themeLabel('system', true), 'Theme: System. Switch to Light')
assert.equal(themeLabel('light', false), 'Theme: Light. Switch to System')
assert.equal(themeLabel('dark', true), 'Theme: Dark. Switch to System')

console.log('theme tests passed')
