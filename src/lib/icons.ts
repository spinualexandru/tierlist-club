import downloadIcon from 'lucide-static/icons/download.svg?raw'
import listPlusIcon from 'lucide-static/icons/list-plus.svg?raw'
import loaderCircleIcon from 'lucide-static/icons/loader-circle.svg?raw'
import minusIcon from 'lucide-static/icons/minus.svg?raw'
import plusIcon from 'lucide-static/icons/plus.svg?raw'
import refreshCwIcon from 'lucide-static/icons/refresh-cw.svg?raw'
import rotateCcwIcon from 'lucide-static/icons/rotate-ccw.svg?raw'
import searchIcon from 'lucide-static/icons/search.svg?raw'
import trashIcon from 'lucide-static/icons/trash-2.svg?raw'
import xIcon from 'lucide-static/icons/x.svg?raw'

/** Inline a lucide-static SVG, swapping in our own classes. */
export const lucide = (raw: string, classes: string): string =>
  raw
    .replace(/<!--.*?-->/s, '')
    .replace('<svg', '<svg aria-hidden="true"')
    .replace(/class="lucide[^"]*"/, `class="${classes}"`)

/** Tier hover controls, sized against the tier letters. */
export const PLUS_ICON = lucide(plusIcon, 'h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5')
export const MINUS_ICON = lucide(minusIcon, 'h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5')
export const TRASH_ICON = lucide(
  trashIcon,
  'h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 xl:h-9 xl:w-9',
)

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
