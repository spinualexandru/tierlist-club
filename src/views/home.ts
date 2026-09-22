import { atom } from 'nanostores'
import { themeClass } from '../theme'
import tier from '../components/tier'
import { allProviderIds } from '../providers'

const TIERS = ['S', 'A', 'B', 'C', 'D', 'F'] as const

type TierItems = Record<string, string[]>

/** Provider ids per tier letter. Everyone starts in F. */
const tierItems = atom<TierItems>(
  Object.fromEntries(
    TIERS.map((letter) => [letter, letter === 'F' ? [...allProviderIds] : []] as const),
  ),
)

const tiersHtml = (items: TierItems): string =>
  TIERS.map((letter) => tier({ letter, items: items[letter] ?? [] })).join('')

/**
 * Move a provider to a tier, removing it from any other. When `beforeId` is
 * given the provider is inserted in front of it, otherwise it is appended.
 */
const moveProvider = (items: TierItems, id: string, to: string, beforeId?: string): TierItems =>
  Object.fromEntries(
    Object.entries(items).map(([letter, list]) => {
      const rest = list.filter((item) => item !== id)
      if (letter !== to) return [letter, rest] as const
      const at = beforeId ? rest.indexOf(beforeId) : -1
      if (at === -1) return [letter, [...rest, id]] as const
      return [letter, [...rest.slice(0, at), id, ...rest.slice(at)]] as const
    }),
  )

/** Custom MIME type so only our own drags light up the UI. */
const DRAG_MIME = 'application/x-ai-tierlist'

const FLIP_DURATION_MS = 250
const FLIP_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'

export default function (app: HTMLDivElement) {
  let lastMovedId: string | null = null
  let activeDragId: string | null = null
  let ghost: HTMLElement | null = null

  // Re-render the tier rows, gliding surviving providers into their new spots (FLIP).
  const renderTiers = (items: TierItems) => {
    const root = app.querySelector<HTMLElement>('[data-tiers]')
    if (!root) return

    const before = new Map<string, DOMRect>()
    for (const cell of root.querySelectorAll<HTMLElement>('[data-provider]')) {
      const id = cell.dataset.provider
      if (id) before.set(id, cell.getBoundingClientRect())
    }

    root.innerHTML = tiersHtml(items)

    for (const cell of root.querySelectorAll<HTMLElement>('[data-provider]')) {
      const id = cell.dataset.provider
      if (!id) continue

      // The dropped provider pops into its new tier instead of flying over.
      if (id === lastMovedId) {
        cell.classList.add('dropped')
        continue
      }

      const rect = before.get(id)
      if (!rect) continue
      const dx = rect.left - cell.getBoundingClientRect().left
      const dy = rect.top - cell.getBoundingClientRect().top
      if (dx === 0 && dy === 0) continue

      cell.style.transition = 'none'
      cell.style.transform = `translate(${dx}px, ${dy}px)`
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          cell.style.transition = `transform ${FLIP_DURATION_MS}ms ${FLIP_EASING}`
          cell.style.transform = ''
          cell.addEventListener(
            'transitionend',
            () => {
              cell.style.transition = ''
            },
            { once: true },
          )
        })
      })
    }
    lastMovedId = null
  }
  tierItems.subscribe(renderTiers)

  const clearGlow = () => {
    for (const el of app.querySelectorAll('[data-tier].drag-over')) el.classList.remove('drag-over')
  }

  const clearDragState = () => {
    for (const el of app.querySelectorAll('.dragging')) el.classList.remove('dragging')
    clearGlow()
  }

  const currentTierOf = (id: string): string | undefined => {
    const items = tierItems.get()
    return TIERS.find((letter) => items[letter]?.includes(id))
  }

  /**
   * First provider cell (in flow order) that a drop at (x, y) would insert in
   * front of, or null to append at the end. Compared against cell midpoints so
   * the placement stays stable while the ghost shifts the layout around.
   */
  const insertionPoint = (container: HTMLElement, x: number, y: number): HTMLElement | null => {
    for (const cell of container.querySelectorAll<HTMLElement>('[data-provider]')) {
      const rect = cell.getBoundingClientRect()
      const sameLine = y >= rect.top && y <= rect.bottom
      if (y < rect.top || (sameLine && x < rect.left + rect.width / 2)) return cell
    }
    return null
  }

  const detachGhost = () => ghost?.remove()

  const endDrag = () => {
    ghost?.remove()
    ghost = null
    activeDragId = null
    clearDragState()
  }

  app.addEventListener('dragstart', (event) => {
    const cell =
      event.target instanceof Element ? event.target.closest<HTMLElement>('[data-provider]') : null
    const id = cell?.dataset.provider
    const transfer = event.dataTransfer
    if (!cell || !id || !transfer) return
    transfer.setData(DRAG_MIME, id)
    transfer.setData('text/plain', id)
    transfer.effectAllowed = 'move'

    activeDragId = id
    cell.classList.add('dragging')

    // Ghost preview, shown while hovering a tier the provider is not already in.
    ghost = cell.cloneNode(true) as HTMLElement
    ghost.classList.remove('dragging', 'dropped')
    ghost.classList.add('ghost')
    ghost.removeAttribute('data-provider')
    ghost.removeAttribute('title')
    ghost.setAttribute('aria-hidden', 'true')
    ghost.draggable = false
    ghost.querySelector('img')?.setAttribute('alt', '')
    ghost.style.transition = ''
    ghost.style.transform = ''
  })

  app.addEventListener('dragover', (event) => {
    const row =
      event.target instanceof Element ? event.target.closest<HTMLElement>('[data-tier]') : null
    const transfer = event.dataTransfer
    if (!row || !transfer?.types.includes(DRAG_MIME)) {
      clearGlow()
      detachGhost()
      return
    }
    event.preventDefault()
    transfer.dropEffect = 'move'
    if (!row.classList.contains('drag-over')) {
      clearGlow()
      row.classList.add('drag-over')
    }

    // Preview the drop position, except inside the tier the provider already sits in.
    const container = row.querySelector<HTMLElement>('[data-items]')
    if (!ghost || !activeDragId || !container || row.dataset.tier === currentTierOf(activeDragId)) {
      detachGhost()
      return
    }
    const next = insertionPoint(container, event.clientX, event.clientY)
    if (ghost.parentElement !== container || ghost.nextSibling !== next) {
      container.insertBefore(ghost, next)
    }
  })

  app.addEventListener('drop', (event) => {
    const row =
      event.target instanceof Element ? event.target.closest<HTMLElement>('[data-tier]') : null
    const id = event.dataTransfer?.getData(DRAG_MIME)
    const letter = row?.dataset.tier
    if (!row || !id || !letter) return
    event.preventDefault()

    // Land exactly where the ghost preview showed.
    const container = row.querySelector<HTMLElement>('[data-items]')
    const beforeId = container
      ? insertionPoint(container, event.clientX, event.clientY)?.dataset.provider
      : undefined
    endDrag()
    if (beforeId === id) return // dropped onto itself — nothing to move

    lastMovedId = id
    tierItems.set(moveProvider(tierItems.get(), id, letter, beforeId))
  })

  // Cleanup after cancelled drags (successful drops re-render fresh markup).
  app.addEventListener('dragend', endDrag)

  // Glow and preview fall off once the pointer leaves the window mid-drag.
  app.addEventListener('dragleave', (event) => {
    if (!event.relatedTarget) {
      clearGlow()
      detachGhost()
    }
  })

  return html`
    <div class="${themeClass}">
      <div
        data-tiers
        class="flex-1 flex flex-col w-full h-full rounded-2xl md:rounded-3xl border border-tier-border overflow-x-hidden overflow-y-auto divide-y divide-tier-border shadow-2xl"
      >
        ${tiersHtml(tierItems.get())}
      </div>
    </div>
  `
}
