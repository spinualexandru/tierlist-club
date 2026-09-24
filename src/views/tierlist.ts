import { atom, type WritableAtom } from 'nanostores'
import { themeClass } from '../theme'
import actionButton from '../components/action-button'
import tier from '../components/tier'
import { DOWNLOAD_ICON, RESET_ICON } from '../lib/icons'
import type { TierList, TierOption } from '../lib/tierlist'
import { initialTierState, moveOption, spawnTier, deleteTier, type TierState } from '../lib/tiers'

/** Option placement per tier, per tier list id — kept while navigating between lists. */
const tierStates = new Map<string, WritableAtom<TierState>>()

const initialStateOf = (list: TierList): TierState =>
  initialTierState(
    list.tiers,
    list.options.map((option) => option.id),
  )

const tierStateOf = (list: TierList): WritableAtom<TierState> => {
  let state = tierStates.get(list.id)
  if (!state) {
    state = atom(initialStateOf(list))
    tierStates.set(list.id, state)
  }
  return state
}

const tiersHtml = ({ order, items }: TierState, optionsById: Map<string, TierOption>): string =>
  order
    .map((id) =>
      tier({
        id,
        items: (items[id] ?? []).flatMap((optionId) => optionsById.get(optionId) ?? []),
        canSpawnAbove: !order.includes(`${id}+`),
        canSpawnBelow: !order.includes(`${id}-`),
      }),
    )
    .join('')

/** Custom MIME type so only our own drags light up the UI. */
const DRAG_MIME = 'application/x-ai-tierlist'

const FLIP_DURATION_MS = 250
const FLIP_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'

// Rainbow border around the tier list, disabled for now: swap these two lines to bring it back.
// const TIER_LIST_FRAME = 'rainbow-border'
const TIER_LIST_FRAME = ''

export default function (app: HTMLDivElement, list: TierList, signal: AbortSignal) {
  const tierState = tierStateOf(list)
  const optionsById = new Map(list.options.map((option) => [option.id, option] as const))

  let lastMovedId: string | null = null
  let activeDragId: string | null = null
  let ghost: HTMLElement | null = null

  // Re-render the tier rows, gliding surviving options into their new spots (FLIP).
  const renderTiers = (state: TierState) => {
    const root = app.querySelector<HTMLElement>('[data-tiers]')
    if (!root) return

    const before = new Map<string, DOMRect>()
    for (const cell of root.querySelectorAll<HTMLElement>('[data-option]')) {
      const id = cell.dataset.option
      if (id) before.set(id, cell.getBoundingClientRect())
    }

    root.innerHTML = tiersHtml(state, optionsById)

    for (const cell of root.querySelectorAll<HTMLElement>('[data-option]')) {
      const id = cell.dataset.option
      if (!id) continue

      // The dropped option pops into its new tier instead of flying over.
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
  signal.addEventListener('abort', tierState.listen(renderTiers), { once: true })

  // Hover controls on the tier letter: +/− spawn a variant, trash deletes it.
  app.addEventListener(
    'click',
    (event) => {
      if (!(event.target instanceof Element)) return
      const spawn = event.target.closest<HTMLElement>('[data-add-above], [data-add-below]')
      if (spawn) {
        const id = spawn.dataset.addAbove ?? spawn.dataset.addBelow
        if (id) tierState.set(spawnTier(tierState.get(), id, spawn.dataset.addAbove ? '+' : '-'))
        return
      }
      const remove = event.target.closest<HTMLElement>('[data-remove]')
      if (remove?.dataset.remove) tierState.set(deleteTier(tierState.get(), remove.dataset.remove))
    },
    { signal },
  )

  // Reset takes a second click within a few seconds, so a stray click can't wipe the ranking.
  const RESET_CONFIRM_MS = 3000
  let resetTimer: ReturnType<typeof setTimeout> | undefined
  const armReset = (button: HTMLElement, armed: boolean) => {
    clearTimeout(resetTimer)
    if (armed) resetTimer = setTimeout(() => armReset(button, false), RESET_CONFIRM_MS)
    button.style.setProperty('--confirm-duration', `${RESET_CONFIRM_MS}ms`)
    button.setAttribute(
      'aria-label',
      armed ? 'Reset tier list? Click again to confirm' : 'Reset tier list',
    )
    button.toggleAttribute('data-armed', armed)
  }
  signal.addEventListener('abort', () => clearTimeout(resetTimer), { once: true })

  app.addEventListener(
    'click',
    (event) => {
      const reset =
        event.target instanceof Element ? event.target.closest<HTMLElement>('[data-reset]') : null
      if (!reset) return
      if (!reset.hasAttribute('data-armed')) return armReset(reset, true)
      armReset(reset, false)
      tierState.set(initialStateOf(list))
    },
    { signal },
  )

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
      link.download = `${list.id}.png`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error('Failed to export the tier list', error)
    } finally {
      exporting = false
    }
  }

  app.addEventListener(
    'click',
    (event) => {
      if (event.target instanceof Element && event.target.closest('[data-export]')) void exportPng()
    },
    { signal },
  )

  const clearGlow = () => {
    for (const el of app.querySelectorAll('[data-tier].drag-over')) el.classList.remove('drag-over')
  }

  const clearDragState = () => {
    for (const el of app.querySelectorAll('.dragging'))
      el.classList.remove('dragging', 'stepped-aside')
    clearGlow()
  }

  const currentTierOf = (id: string): string | undefined => {
    const { order, items } = tierState.get()
    return order.find((tierId) => items[tierId]?.includes(id))
  }

  /**
   * First option cell (in flow order) that a drop at (x, y) would insert in
   * front of, or null to append at the end. Compared against cell midpoints so
   * the placement stays stable while the ghost shifts the layout around. The
   * dragged option itself is skipped, since the ghost stands in for it.
   */
  const insertionPoint = (container: HTMLElement, x: number, y: number): HTMLElement | null => {
    for (const cell of container.querySelectorAll<HTMLElement>('[data-option]')) {
      if (cell.dataset.option === activeDragId) continue
      const rect = cell.getBoundingClientRect()
      const sameLine = y >= rect.top && y <= rect.bottom
      if (y < rect.top || (sameLine && x < rect.left + rect.width / 2)) return cell
    }
    return null
  }

  /**
   * Inside its own tier the dragged cell steps aside (collapses), so the ghost
   * alone shows where it will land instead of the option appearing twice.
   */
  const setSourceSteppedAside = (on: boolean) =>
    app.querySelector('.option-cell.dragging')?.classList.toggle('stepped-aside', on)

  const hidePreview = () => {
    ghost?.remove()
    setSourceSteppedAside(false)
  }

  // Drags pass through the floating actions, so they never block a drop into the bottom tier.
  const setActionsDragThrough = (on: boolean) =>
    app.querySelector('[data-actions]')?.classList.toggle('drag-through', on)

  const endDrag = () => {
    setActionsDragThrough(false)
    ghost?.remove()
    ghost = null
    activeDragId = null
    clearDragState()
  }

  app.addEventListener(
    'dragstart',
    (event) => {
      const cell =
        event.target instanceof Element ? event.target.closest<HTMLElement>('[data-option]') : null
      const id = cell?.dataset.option
      const transfer = event.dataTransfer
      if (!cell || !id || !transfer) return
      transfer.setData(DRAG_MIME, id)
      transfer.setData('text/plain', id)
      transfer.effectAllowed = 'move'

      activeDragId = id
      cell.classList.add('dragging')
      setActionsDragThrough(true)

      // Ghost preview of the drop position, shown while hovering any tier.
      ghost = cell.cloneNode(true) as HTMLElement
      ghost.classList.remove('dragging', 'dropped')
      ghost.classList.add('ghost')
      ghost.removeAttribute('data-option')
      ghost.removeAttribute('title')
      ghost.setAttribute('aria-hidden', 'true')
      ghost.draggable = false
      ghost.querySelector('img')?.setAttribute('alt', '')
      ghost.style.transition = ''
      ghost.style.transform = ''
    },
    { signal },
  )

  app.addEventListener(
    'dragover',
    (event) => {
      const row =
        event.target instanceof Element ? event.target.closest<HTMLElement>('[data-tier]') : null
      const transfer = event.dataTransfer
      if (!row || !transfer?.types.includes(DRAG_MIME)) {
        clearGlow()
        hidePreview()
        return
      }
      event.preventDefault()
      transfer.dropEffect = 'move'
      if (!row.classList.contains('drag-over')) {
        clearGlow()
        row.classList.add('drag-over')
      }

      // Preview the drop position with the ghost.
      const container = row.querySelector<HTMLElement>('[data-items]')
      if (!ghost || !activeDragId || !container) {
        hidePreview()
        return
      }
      setSourceSteppedAside(row.dataset.tier === currentTierOf(activeDragId))
      const next = insertionPoint(container, event.clientX, event.clientY)
      if (ghost.parentElement !== container || ghost.nextSibling !== next) {
        container.insertBefore(ghost, next)
      }
    },
    { signal },
  )

  app.addEventListener(
    'drop',
    (event) => {
      const row =
        event.target instanceof Element ? event.target.closest<HTMLElement>('[data-tier]') : null
      const id = event.dataTransfer?.getData(DRAG_MIME)
      const tierId = row?.dataset.tier
      if (!row || !id || !tierId) return
      event.preventDefault()

      // Land exactly where the ghost preview showed.
      const container = row.querySelector<HTMLElement>('[data-items]')
      const beforeId = container
        ? insertionPoint(container, event.clientX, event.clientY)?.dataset.option
        : undefined
      const moved = moveOption(tierState.get(), id, tierId, beforeId)
      const unchanged = moved.items[tierId]?.join() === tierState.get().items[tierId]?.join()
      if (unchanged) return endDrag() // dropped back where it was — nothing to move

      // Re-render while the ghost is still in place: the FLIP "before" positions
      // then match what the preview showed, so cells it had already pushed aside
      // stay put instead of snapping back and sliding over again.
      lastMovedId = id
      tierState.set(moved)
      endDrag()
    },
    { signal },
  )

  // Cleanup after cancelled drags (successful drops re-render fresh markup).
  app.addEventListener('dragend', endDrag, { signal })

  // Glow and preview fall off once the pointer leaves the window mid-drag.
  app.addEventListener(
    'dragleave',
    (event) => {
      if (!event.relatedTarget) {
        clearGlow()
        hidePreview()
      }
    },
    { signal },
  )

  return html`
    <div class="${themeClass}">
      <div class="relative flex-1 min-w-0 h-full">
        <div
          data-tiers
          class="${TIER_LIST_FRAME} flex flex-col w-full h-full rounded-2xl md:rounded-3xl overflow-x-hidden overflow-y-auto divide-y divide-tier-border shadow-2xl"
        >
          ${tiersHtml(tierState.get(), optionsById)}
        </div>
        <div
          data-actions
          role="toolbar"
          aria-label="Tier list actions"
          class="floating-actions absolute bottom-3 right-3 z-10 flex items-center gap-2"
        >
          ${actionButton({
            action: 'reset',
            label: 'Reset tier list',
            icon: RESET_ICON,
            frame: 'border border-tier-s bg-background',
            confirmLabel: 'You sure?',
          })}
          ${actionButton({
            action: 'export',
            label: 'Save as PNG',
            icon: DOWNLOAD_ICON,
            frame: 'rainbow-border-spin',
          })}
        </div>
      </div>
    </div>
  `
}
