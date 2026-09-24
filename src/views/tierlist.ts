import { atom, type WritableAtom } from 'nanostores'
import { themeClass } from '../theme'
import actionButton from '../components/action-button'
import optionPicker, { optionPickerItems } from '../components/option-picker'
import tier from '../components/tier'
import { genie } from '../lib/genie'
import { DOWNLOAD_ICON, RESET_ICON } from '../lib/icons'
import type { TierList, TierOption } from '../lib/tierlist'
import {
  initialTierState,
  addOptions,
  moveOption,
  removeOption,
  spawnTier,
  deleteTier,
  unrankedOptions,
  type TierState,
} from '../lib/tiers'

/** Option placement per tier, per tier list id — kept while navigating between lists. */
const tierStates = new Map<string, WritableAtom<TierState>>()

const initialStateOf = (list: TierList): TierState => initialTierState(list.tiers)

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

/** FLIP: glide an element from its old spot (`from`) into its current one. */
const glide = (el: HTMLElement, from: DOMRect) => {
  const to = el.getBoundingClientRect()
  const dx = from.left - to.left
  const dy = from.top - to.top
  if (dx === 0 && dy === 0) return
  el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
    duration: FLIP_DURATION_MS,
    easing: FLIP_EASING,
  })
}

/** Delay between options popping in together, e.g. after "Add all". */
const POP_STAGGER_MS = 25

/** The trash can's gulp once a deleted option is in, fading it out. */
const GULP_DURATION_MS = 320

// Rainbow border around the tier list, disabled for now: swap these two lines to bring it back.
// const TIER_LIST_FRAME = 'rainbow-border'
const TIER_LIST_FRAME = ''

export default function (app: HTMLDivElement, list: TierList, signal: AbortSignal) {
  const tierState = tierStateOf(list)
  const optionsById = new Map(list.options.map((option) => [option.id, option] as const))
  const optionIds = list.options.map((option) => option.id)
  const unrankedOf = (state: TierState): TierOption[] =>
    unrankedOptions(state, optionIds).flatMap((id) => optionsById.get(id) ?? [])

  /** Options just dropped or added, which pop into their tier instead of gliding there. */
  let poppingIds = new Set<string>()
  let activeDragId: string | null = null
  let ghost: HTMLElement | null = null
  /** Where the pointer grabbed the dragged option, relative to its cell. */
  let grabOffset = { x: 0, y: 0 }
  /** Set while a trashed option is being sucked in, before it leaves the list. */
  let discarding = false

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

    let popped = 0
    for (const cell of root.querySelectorAll<HTMLElement>('[data-option]')) {
      const id = cell.dataset.option
      if (!id) continue

      if (poppingIds.has(id)) {
        cell.style.animationDelay = `${popped++ * POP_STAGGER_MS}ms`
        cell.classList.add('dropped')
        continue
      }

      const rect = before.get(id)
      if (rect) glide(cell, rect)
    }
    poppingIds = new Set()
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

  // Option picker: the drawer a tier's "+" cell opens, listing the options not on the list yet.
  let pickerTier: string | null = null
  const pickerOf = () => app.querySelector<HTMLDialogElement>('[data-picker]')

  const openPicker = (tierId: string) => {
    const picker = pickerOf()
    if (!picker) return
    pickerTier = tierId
    picker.innerHTML = optionPicker({ tier: tierId, options: unrankedOf(tierState.get()) })
    picker.showModal()
    // Picks re-render the tier, replacing the "+" that opened the picker, so the
    // dialog can't hand focus back to it by itself.
    picker.addEventListener(
      'close',
      () => app.querySelector<HTMLElement>(`[data-add-option="${tierId}"]`)?.focus(),
      { once: true, signal },
    )
  }

  // Keep the open picker in sync, handing focus from a picked option to its neighbor.
  const refreshPicker = (state: TierState) => {
    const picker = pickerOf()
    const items = picker?.querySelector<HTMLElement>('[data-picker-items]')
    if (!picker?.open || !items) return
    if (!pickerTier || !state.order.includes(pickerTier)) return picker.close()

    const picks = () => [...items.querySelectorAll<HTMLElement>('[data-pick]')]
    const focused = picks().findIndex((pick) => pick === document.activeElement)
    items.innerHTML = optionPickerItems({ tier: pickerTier, options: unrankedOf(state) })
    if (focused === -1) return
    const next = picks()
    const target =
      next[Math.min(focused, next.length - 1)] ??
      picker.querySelector<HTMLElement>('[data-picker-close]')
    target?.focus()
  }
  signal.addEventListener('abort', tierState.listen(refreshPicker), { once: true })

  app.addEventListener(
    'click',
    (event) => {
      if (!(event.target instanceof Element)) return
      const add = event.target.closest<HTMLElement>('[data-add-option]')
      if (add?.dataset.addOption) return openPicker(add.dataset.addOption)

      // Picking keeps the drawer open, so several options can go into the tier in a row;
      // "Add all" leaves nothing to pick, so it closes the drawer as they pop in.
      const pick = event.target.closest<HTMLElement>('[data-pick]')
      const pickAll = event.target.closest('[data-pick-all]')
      if ((pick?.dataset.pick || pickAll) && pickerTier) {
        const ids = pick?.dataset.pick
          ? [pick.dataset.pick]
          : unrankedOptions(tierState.get(), optionIds)
        const next = addOptions(tierState.get(), ids, pickerTier)
        if (next !== tierState.get()) {
          poppingIds = new Set(ids)
          tierState.set(next)
        }
        if (pickAll) pickerOf()?.close()
        return
      }

      // Close on the X, or on a click on the backdrop, which targets the dialog itself.
      if (event.target.closest('[data-picker-close]') || event.target.matches('[data-picker]')) {
        pickerOf()?.close()
      }
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
        // Leave out the ghost "+" and trash cells.
        filter: (el) => !(el instanceof Element && el.matches('[data-add-option], [data-trash]')),
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

  /** Light up the trash can under the dragged option (lid open, "Delete"), or none. */
  const armTrash = (bin: HTMLElement | null) => {
    for (const el of app.querySelectorAll('[data-trash].armed')) {
      if (el !== bin) el.classList.remove('armed')
    }
    bin?.classList.add('armed')
  }

  const clearDragState = () => {
    for (const el of app.querySelectorAll('.dragging'))
      el.classList.remove('dragging', 'stepped-aside')
    clearGlow()
    armTrash(null)
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

  /**
   * Suck an option dropped on the trash can into it, genie-style, then take it
   * off the list. Its cell leaves the layout right away, and the rest of the
   * list — the can included — glides over to close the gap while a copy pours
   * into the can. The can stays out until then, so the state only changes
   * once the animation is done.
   */
  const discard = async (id: string, bin: HTMLElement, x: number, y: number) => {
    const cell = app.querySelector<HTMLElement>('.option-cell.dragging')
    discarding = true
    bin.closest('[data-tier]')?.classList.add('discarding')
    endDrag()
    try {
      if (!cell || matchMedia('(prefers-reduced-motion: reduce)').matches) return
      bin.classList.add('armed')

      // The copy pours from where the drag image was let go.
      const copy = cell.cloneNode(true) as HTMLElement
      const from = new DOMRect(
        x - grabOffset.x,
        y - grabOffset.y,
        cell.offsetWidth,
        cell.offsetHeight,
      )
      const movers = [...app.querySelectorAll<HTMLElement>('[data-option]'), bin].filter(
        (el) => el !== cell,
      )
      const before = movers.map((el) => el.getBoundingClientRect())
      cell.classList.add('discarded')

      // Aim for the can's opening where it ends up, measured before the glides move it.
      const chip = (bin.querySelector('.trash-chip') ?? bin).getBoundingClientRect()
      movers.forEach((el, i) => glide(el, before[i]))
      await genie(copy, from, { x: chip.left + chip.width / 2, y: chip.top + chip.height * 0.4 })
      bin.classList.remove('armed') // the lid shuts
      await bin.animate(
        [
          { transform: 'scale(1)', opacity: 1 },
          { transform: 'scale(1.12)', opacity: 1, offset: 0.3 },
          { transform: 'scale(0.6)', opacity: 0 },
        ],
        { duration: GULP_DURATION_MS, easing: 'ease-in', fill: 'forwards' },
      ).finished
    } finally {
      discarding = false
      tierState.set(removeOption(tierState.get(), id))
    }
  }

  app.addEventListener(
    'dragstart',
    (event) => {
      if (discarding) return event.preventDefault()
      const cell =
        event.target instanceof Element ? event.target.closest<HTMLElement>('[data-option]') : null
      const id = cell?.dataset.option
      const transfer = event.dataTransfer
      if (!cell || !id || !transfer) return
      transfer.setData(DRAG_MIME, id)
      transfer.setData('text/plain', id)
      transfer.effectAllowed = 'move'

      const rect = cell.getBoundingClientRect()
      grabOffset = { x: event.clientX - rect.left, y: event.clientY - rect.top }
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
      const target = event.target instanceof Element ? event.target : null
      const row = target?.closest<HTMLElement>('[data-tier]')
      const transfer = event.dataTransfer
      if (!row || !transfer?.types.includes(DRAG_MIME)) {
        clearGlow()
        hidePreview()
        armTrash(null)
        return
      }
      event.preventDefault()
      transfer.dropEffect = 'move'

      // Over the trash can the option waits in its own spot, instead of previewing a new one.
      const bin = target?.closest<HTMLElement>('[data-trash]') ?? null
      armTrash(bin)
      if (bin) {
        clearGlow()
        hidePreview()
        return
      }

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
      // Past the last option, the ghost still goes before the trailing "+" and trash cells.
      const next =
        insertionPoint(container, event.clientX, event.clientY) ??
        container.querySelector(':scope > [data-add-option]')
      if (ghost.parentElement !== container || ghost.nextSibling !== next) {
        container.insertBefore(ghost, next)
      }
    },
    { signal },
  )

  app.addEventListener(
    'drop',
    (event) => {
      const target = event.target instanceof Element ? event.target : null
      const row = target?.closest<HTMLElement>('[data-tier]')
      const id = event.dataTransfer?.getData(DRAG_MIME)
      const tierId = row?.dataset.tier
      if (!row || !id || !tierId) return
      event.preventDefault()

      const bin = target?.closest<HTMLElement>('[data-trash]')
      if (bin) {
        void discard(id, bin, event.clientX, event.clientY)
        return
      }

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
      poppingIds = new Set([id])
      tierState.set(moved)
      endDrag()
    },
    { signal },
  )

  // Cleanup after cancelled drags (successful drops re-render fresh markup, and a
  // discard has cleaned up already — and must keep its trash can lit).
  app.addEventListener(
    'dragend',
    () => {
      if (!discarding) endDrag()
    },
    { signal },
  )

  // Glow and preview fall off once the pointer leaves the window mid-drag.
  app.addEventListener(
    'dragleave',
    (event) => {
      if (!event.relatedTarget) {
        clearGlow()
        hidePreview()
        armTrash(null)
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
      <dialog
        data-picker
        aria-labelledby="option-picker-title"
        class="option-picker scheme-dark m-0 left-auto right-0 h-dvh max-h-dvh w-80 sm:w-96 max-w-[85vw] p-0 border-0 border-l border-white/10 bg-neutral-900 text-white shadow-2xl shadow-black/60"
      ></dialog>
    </div>
  `
}
