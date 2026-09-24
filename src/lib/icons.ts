import downloadIcon from 'lucide-static/icons/download.svg?raw'
import minusIcon from 'lucide-static/icons/minus.svg?raw'
import plusIcon from 'lucide-static/icons/plus.svg?raw'
import rotateCcwIcon from 'lucide-static/icons/rotate-ccw.svg?raw'
import trashIcon from 'lucide-static/icons/trash-2.svg?raw'

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
  'h-7 w-7 sm:h-9 sm:w-9 md:h-11 md:w-11 lg:h-12 lg:w-12 xl:h-14 xl:w-14',
)

/** Floating tier list actions. */
export const DOWNLOAD_ICON = lucide(downloadIcon, 'h-7 w-7')
export const RESET_ICON = lucide(rotateCcwIcon, 'h-7 w-7')
