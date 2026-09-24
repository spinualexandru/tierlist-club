import { atom } from 'nanostores'
import { themeClass } from '../theme'
import tier from '../components/tier'
import { allProviderIds } from '../providers'
import { CAMERA_ICON } from '../lib/icons'
import { initialTierState, moveProvider, spawnTier, deleteTier, type TierState } from '../lib/tiers'

/** Provider placement per tier. Everyone starts in F. */
const tierState = atom<TierState>(initialTierState(allProviderIds))

const tiersHtml = ({ order, items }: TierState): string =>
  order
    .map((id) =>
      tier({
        id,
        items: items[id] ?? [],
        canSpawnAbove: !order.includes(`${id}+`),
        canSpawnBelow: !order.includes(`${id}-`),
      }),
    )
    .join('')

/** Custom MIME type so only our own drags light up the UI. */
const DRAG_MIME = 'application/x-ai-tierlist'

const FLIP_DURATION_MS = 250
const FLIP_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'

export default function (app: HTMLDivElement) {
  let lastMovedId: string | null = null
  let activeDragId: string | null = null
  let ghost: HTMLElement | null = null

  // Re-render the tier rows, gliding surviving providers into their new spots (FLIP).
  const renderTiers = (state: TierState) => {
    const root = app.querySelector<HTMLElement>('[data-tiers]')
    if (!root) return

    const before = new Map<string, DOMRect>()
    for (const cell of root.querySelectorAll<HTMLElement>('[data-provider]')) {
      const id = cell.dataset.provider
      if (id) before.set(id, cell.getBoundingClientRect())
    }

    root.innerHTML = tiersHtml(state)

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
  tierState.subscribe(renderTiers)

  // Hover controls on the tier letter: +/− spawn a variant, trash deletes it.
  app.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return
    const spawn = event.target.closest<HTMLElement>('[data-add-above], [data-add-below]')
    if (spawn) {
      const id = spawn.dataset.addAbove ?? spawn.dataset.addBelow
      if (id) tierState.set(spawnTier(tierState.get(), id, spawn.dataset.addAbove ? '+' : '-'))
      return
    }
    const remove = event.target.closest<HTMLElement>('[data-remove]')
    if (remove?.dataset.remove) tierState.set(deleteTier(tierState.get(), remove.dataset.remove))
  })

  // Camera-flash feedback while the tier list is being captured.
  const flash = () => {
    const el = document.createElement('div')
    el.className = 'export-flash'
    el.setAttribute('aria-hidden', 'true')
    document.body.appendChild(el)
    el.addEventListener('animationend', () => el.remove(), { once: true })
  }

  // Capture the whole tier list (including rows scrolled out of view) as a PNG download.
  let exporting = false
  const exportPng = async () => {
    const node = app.querySelector<HTMLElement>('[data-tiers]')
    if (!node || exporting) return
    exporting = true
    try {
      flash()
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: '#111111',
        width: node.scrollWidth,
        height: node.scrollHeight,
      })
      const link = document.createElement('a')
      link.download = 'ai-tierlist.png'
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error('Failed to export the tier list', error)
    } finally {
      exporting = false
    }
  }

  app.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('[data-export]')) void exportPng()
  })

  const clearGlow = () => {
    for (const el of app.querySelectorAll('[data-tier].drag-over')) el.classList.remove('drag-over')
  }

  const clearDragState = () => {
    for (const el of app.querySelectorAll('.dragging')) el.classList.remove('dragging')
    clearGlow()
  }

  const currentTierOf = (id: string): string | undefined => {
    const { order, items } = tierState.get()
    return order.find((tierId) => items[tierId]?.includes(id))
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
    const tierId = row?.dataset.tier
    if (!row || !id || !tierId) return
    event.preventDefault()

    // Land exactly where the ghost preview showed.
    const container = row.querySelector<HTMLElement>('[data-items]')
    const beforeId = container
      ? insertionPoint(container, event.clientX, event.clientY)?.dataset.provider
      : undefined
    endDrag()
    if (beforeId === id) return // dropped onto itself — nothing to move

    lastMovedId = id
    tierState.set(moveProvider(tierState.get(), id, tierId, beforeId))
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
        ${tiersHtml(tierState.get())}
      </div>
      <button
        type="button"
        data-export
        aria-label="Save tier list as PNG"
        title="Save tier list as PNG"
        class="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 inline-flex items-center justify-center h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-brand text-white shadow-lg shadow-brand/40 cursor-pointer select-none hover:scale-110 active:scale-90 transition duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        ${CAMERA_ICON}
      </button>
    </div>
  `
}
