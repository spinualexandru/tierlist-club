import botIcon from 'lucide-static/icons/bot.svg?raw'
import broomIcon from 'lucide-static/icons/broom.svg?raw'
import checkIcon from 'lucide-static/icons/check.svg?raw'
import chevronDownIcon from 'lucide-static/icons/chevron-down.svg?raw'
import copyIcon from 'lucide-static/icons/copy.svg?raw'
import downloadIcon from 'lucide-static/icons/download.svg?raw'
import listPlusIcon from 'lucide-static/icons/list-plus.svg?raw'
import loaderCircleIcon from 'lucide-static/icons/loader-circle.svg?raw'
import minusIcon from 'lucide-static/icons/minus.svg?raw'
import monitorIcon from 'lucide-static/icons/monitor.svg?raw'
import moonIcon from 'lucide-static/icons/moon.svg?raw'
import plusIcon from 'lucide-static/icons/plus.svg?raw'
import refreshCwIcon from 'lucide-static/icons/refresh-cw.svg?raw'
import rotateCcwIcon from 'lucide-static/icons/rotate-ccw.svg?raw'
import searchIcon from 'lucide-static/icons/search.svg?raw'
import share2Icon from 'lucide-static/icons/share-2.svg?raw'
import sunIcon from 'lucide-static/icons/sun.svg?raw'
import trashIcon from 'lucide-static/icons/trash-2.svg?raw'
import xIcon from 'lucide-static/icons/x.svg?raw'

/** Inline a lucide-static SVG, swapping in our own classes. */
export const lucide = (raw: string, classes: string): string =>
  raw
    .replace(/<!--.*?-->/s, '')
    .replace('<svg', '<svg aria-hidden="true"')
    .replace(/class="lucide[^"]*"/, `class="${classes}"`)

/** Site header: the list switcher's chevron, and a check by the active list in its menu. */
export const CHEVRON_DOWN_ICON = lucide(chevronDownIcon, 'h-4.5 w-4.5 stroke-[2.5]')
export const CHECK_ICON = lucide(checkIcon, 'h-4 w-4 text-tier-s')

/** Site header: the WebMCP pill's agent. */
export const BOT_ICON = lucide(botIcon, 'h-4 w-4 stroke-[2.25]')

/** The theme toggle's icons, stacked in its button (see `.theme-toggle` in style.css): one per mode. */
const themeIcon = (raw: string, mode: string) =>
  lucide(raw, `theme-icon-${mode} h-5 w-5 stroke-[2.25]`)
export const THEME_ICONS = [
  themeIcon(sunIcon, 'light'),
  themeIcon(moonIcon, 'dark'),
  themeIcon(monitorIcon, 'system'),
].join('')

/** Tier hover controls, stacked in the flag hanging off the rail. */
export const PLUS_ICON = lucide(plusIcon, 'h-5 w-5 stroke-[2.5]')
export const MINUS_ICON = lucide(minusIcon, 'h-5 w-5 stroke-[2.5]')
export const BROOM_ICON = lucide(broomIcon, 'h-5 w-5 stroke-[2.25]')
export const TRASH_ICON = lucide(trashIcon, 'h-5 w-5 stroke-[2.25]')

/** Ghost cells after a tier's options: add options, or drop one to delete it. */
export const ADD_OPTION_ICON = lucide(plusIcon, 'h-7 w-7 sm:h-8 sm:w-8')
/** Trash can with its lid grouped as `.trash-lid`, so it can swing open. */
export const DISCARD_ICON = lucide(trashIcon, 'h-7 w-7 sm:h-8 sm:w-8').replace(
  /<path d="M3 6h18" \/>\s*<path d="M8 6V4[^>]*\/>/,
  '<g class="trash-lid">$&</g>',
)

/** Option picker drawer. */
export const CLOSE_ICON = lucide(xIcon, 'h-5 w-5')
export const ADD_ALL_ICON = lucide(listPlusIcon, 'h-5 w-5')
export const SEARCH_ICON = lucide(searchIcon, 'h-4 w-4')
export const LOADING_ICON = lucide(
  loaderCircleIcon,
  'h-6 w-6 animate-spin motion-reduce:animate-none',
)
export const RETRY_ICON = lucide(refreshCwIcon, 'h-4 w-4')

/** Floating tier list actions. */
export const DOWNLOAD_ICON = lucide(downloadIcon, 'h-7 w-7')
export const RESET_ICON = lucide(rotateCcwIcon, 'h-7 w-7')
export const SHARE_ICON = lucide(share2Icon, 'h-7 w-7')

/** Share dialog: the copy button swaps its icon for a check once the link is copied. */
export const COPY_ICON = lucide(copyIcon, 'h-4 w-4 group-data-copied:hidden')
export const COPIED_ICON = lucide(checkIcon, 'h-4 w-4 hidden group-data-copied:block')

/** Full-screen loader, e.g. while a shared tier list's options load. */
export const PAGE_LOADING_ICON = lucide(
  loaderCircleIcon,
  'h-10 w-10 animate-spin motion-reduce:animate-none',
)
