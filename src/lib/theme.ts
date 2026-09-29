import { atom } from 'nanostores'

/** How the theme is picked: fixed to light or dark, or following the system's setting. */
export const THEME_MODES = ['light', 'dark', 'system'] as const
export type ThemeMode = (typeof THEME_MODES)[number]

const THEME_LABELS: Record<ThemeMode, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

/** The saved mode. Absent for 'system'. The inline script in index.html reads it too, before first paint. */
const STORAGE_KEY = 'theme'

/** `value` if it's a mode, else 'system': nothing saved yet, or something unknown. */
export const parseThemeMode = (value: unknown): ThemeMode =>
  THEME_MODES.find((mode) => mode === value) ?? 'system'

/**
 * The mode a click on the toggle switches to. Following the system, it pins the
 * opposite of the system's setting, since pinning the same one would change
 * nothing yet; from a pinned theme it goes back to following the system.
 */
export const nextThemeMode = (mode: ThemeMode, systemDark: boolean): ThemeMode =>
  mode === 'system' ? (systemDark ? 'light' : 'dark') : 'system'

/** The toggle's tooltip and accessible name: the current mode, and what a click switches to. */
export const themeLabel = (mode: ThemeMode, systemDark: boolean): string =>
  `Theme: ${THEME_LABELS[mode]}. Switch to ${THEME_LABELS[nextThemeMode(mode, systemDark)]}`

/** The system's setting: `matches` is true while it's dark. */
export const systemTheme = (): MediaQueryList => matchMedia('(prefers-color-scheme: dark)')

/** The current mode. Starts as 'system' until `initTheme` loads the saved one. */
export const themeMode = atom<ThemeMode>('system')

/** The page's background as shown now, whichever theme is in effect. */
export const pageBackground = (): string => getComputedStyle(document.body).backgroundColor

/** Match the browser's own UI (e.g. a phone's address bar) to the page. */
const syncThemeColor = () => {
  const color = pageBackground()
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'))
    meta.content = color
}

/** A fixed mode is set on `<html data-theme>`; style.css falls back to the system's setting without one. */
const applyTheme = (mode: ThemeMode) => {
  if (mode === 'system') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = mode
  syncThemeColor()
}

const savedTheme = (): unknown => {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null // storage blocked (e.g. private mode): the mode just isn't remembered
  }
}

const saveTheme = (mode: ThemeMode) => {
  try {
    if (mode === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // Not remembered, see `savedTheme`.
  }
}

/**
 * Load the saved mode and keep the page in step with `themeMode` from here on:
 * applying and saving each change, following the system's setting while the
 * mode is 'system', and following changes made in other tabs. Call once at startup.
 */
export const initTheme = () => {
  themeMode.set(parseThemeMode(savedTheme()))
  themeMode.subscribe(applyTheme)
  themeMode.listen(saveTheme)
  systemTheme().addEventListener('change', syncThemeColor)
  addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) themeMode.set(parseThemeMode(event.newValue))
  })
}
