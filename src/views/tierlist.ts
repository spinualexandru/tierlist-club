import { Effect } from 'effect'
import { atom, type WritableAtom } from 'nanostores'
import { themeClass } from '../theme'
import actionButton from '../components/action-button'
import optionPicker, { optionPickerItems, type OptionsStatus } from '../components/option-picker'
import shareDialog from '../components/share-dialog'
import siteHeader from '../components/site-header'
import tier from '../components/tier'
import { track } from '../lib/analytics'
import { squareSide } from '../lib/export-size'
import { genie } from '../lib/genie'
import { DOWNLOAD_ICON, RESET_ICON, SHARE_ICON } from '../lib/icons'
import { decodeSelections, encodeSelections, sharePath } from '../lib/share'
import { searchOptions, type TierList, type TierOption } from '../lib/tierlist'
import { tierListPath, tierLists } from '../tierlists'
import { mountSiteHeader } from './site-header'
import {
  initialTierState,
  addOptions,
  moveOption,
  removeOption,
  spawnTier,
  canSpawnTier,
  deleteTier,
  unrankedOptions,
  hasRankedOptions,
  type TierState,
} from '../lib/tiers'

/** Option placement per tier, per tier list id — kept while navigating between lists. */
const tierStates = new Map<string, WritableAtom<TierState>>()

/** Options of tier lists that load theirs, once loaded — so they're only fetched once. */
const loadedOptions = new Map<string, TierOption[]>()

const initialStateOf = (list: TierList): TierState => initialTierState(list.tiers)

/** A list's state, created from `initial` the first time it's asked for. */
const tierStateOf = (
  list: TierList,
  initial: TierState = initialStateOf(list),
): WritableAtom<TierState> => {
  let state = tierStates.get(list.id)
  if (!state) {
    state = atom(initial)
    tierStates.set(list.id, state)
    // A list is started when its first option goes in, including again after a reset.
    // The atom lives as long as the page, so this listener does too.
    state.listen((next, prev) => {
      if (hasRankedOptions(next) && !(prev && hasRankedOptions(prev)))
        track('list_started', list.id)
    })
  }
  return state
}

/** A list's options, loading (and keeping) them if it loads its own. */
const optionsOf = async (list: TierList): Promise<TierOption[]> => {
  if (Array.isArray(list.options)) return list.options
  const options = loadedOptions.get(list.id) ?? (await Effect.runPromise(list.options))
  loadedOptions.set(list.id, options)
  return options
}

/**
 * Fill a list in from a shared link's `selections`, loading its options first
 * to check them against. False (leaving the list as it was) if they're invalid
 * or the options fail to load. A shared list doesn't count as started.
 */
export const openShared = async (list: TierList, selections: string): Promise<boolean> => {
  let options: TierOption[]
  try {
    options = await optionsOf(list)
  } catch (error) {
    console.error(`Failed to load the options of ${list.id}`, error)
    return false
  }
  const shared = decodeSelections(
    selections,
    list.tiers,
    options.map((option) => option.id),
  )
  if (!shared) return false
  if (tierStates.has(list.id)) tierStateOf(list).set(shared)
  else tierStateOf(list, shared)
  return true
}

const tiersHtml = (state: TierState, optionsById: Map<string, TierOption>): string =>
  state.order
    .map((id) =>
      tier({
        id,
        items: (state.items[id] ?? []).flatMap((optionId) => optionsById.get(optionId) ?? []),
        canSpawnAbove: canSpawnTier(state, id, '+'),
        canSpawnBelow: canSpawnTier(state, id, '-'),
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

/** Smallest side of the (square) PNG export, in CSS pixels. */
const MIN_EXPORT_SIDE = 480

/** Background margin around the tier list in the PNG export, in CSS pixels. */
const EXPORT_MARGIN = 32

/** The trash can's gulp once a deleted option is in, fading it out. */
const GULP_DURATION_MS = 320

// Rainbow border around the tier list, disabled for now: swap these two lines to bring it back.
// const TIER_LIST_FRAME = 'rainbow-border'
const TIER_LIST_FRAME = ''

export default function (app: HTMLDivElement, list: TierList, signal: AbortSignal) {
  const tierState = tierStateOf(list)
  let optionsStatus: OptionsStatus = 'loading'
  let optionsById = new Map<string, TierOption>()
  let optionIds: string[] = []
  const setOptions = (options: TierOption[]) => {
    optionsById = new Map(options.map((option) => [option.id, option] as const))
    optionIds = options.map((option) => option.id)
    optionsStatus = 'ready'
  }
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
  let pickerQuery = ''
  /** Whether the list's picker filter is on; it starts on, and stays as set while the list is open. */
  let pickerFiltered = true
  const pickerOf = () => app.querySelector<HTMLDialogElement>('[data-picker]')
  const pickerFilterOf = () =>
    list.pickerFilter && { label: list.pickerFilter.label, checked: pickerFiltered }
  /** Options the picker shows: not on the list yet, kept by the filter, and matching the search. */
  const pickableOf = (state: TierState): TierOption[] => {
    const filter = pickerFiltered ? list.pickerFilter : undefined
    const unranked = unrankedOf(state)
    return searchOptions(filter ? unranked.filter(filter.keep) : unranked, pickerQuery)
  }
  const pickerItemsOf = (tierId: string, state: TierState): string =>
    optionPickerItems({
      tier: tierId,
      options: pickableOf(state),
      searching: pickerQuery.trim() !== '',
      status: optionsStatus,
      filter: pickerFilterOf(),
    })

  const openPicker = (tierId: string) => {
    const picker = pickerOf()
    if (!picker) return
    pickerTier = tierId
    pickerQuery = ''
    picker.innerHTML = optionPicker({
      tier: tierId,
      options: pickableOf(tierState.get()),
      status: optionsStatus,
      filter: pickerFilterOf(),
    })
    picker.showModal()
    // Straight into the search with a keyboard at hand, but no on-screen keyboard popping up on touch.
    if (matchMedia('(pointer: fine)').matches) {
      picker.querySelector<HTMLElement>('[data-picker-search]')?.focus()
    }
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
    const hadFocus = items.contains(document.activeElement)
    items.innerHTML = pickerItemsOf(pickerTier, state)
    // E.g. "Try again", which the spinner replaces: hand focus back to the search.
    if (focused === -1 && hadFocus)
      picker.querySelector<HTMLElement>('[data-picker-search]')?.focus()
    if (focused === -1) return
    const next = picks()
    const target =
      next[Math.min(focused, next.length - 1)] ??
      picker.querySelector<HTMLElement>('[data-picker-close]')
    target?.focus()
  }
  signal.addEventListener('abort', tierState.listen(refreshPicker), { once: true })

  // Lists that load their options start fetching them right away, so they're
  // usually there by the time the picker opens; until then it shows a spinner.
  const loadOptions = async (load: Effect.Effect<TierOption[], unknown>) => {
    optionsStatus = 'loading'
    refreshPicker(tierState.get())
    try {
      const options = await Effect.runPromise(load, { signal })
      loadedOptions.set(list.id, options)
      setOptions(options)
    } catch (error) {
      if (signal.aborted) return
      console.error(`Failed to load the options of ${list.id}`, error)
      optionsStatus = 'failed'
    }
    refreshPicker(tierState.get())
  }

  if (Array.isArray(list.options)) setOptions(list.options)
  else {
    const loaded = loadedOptions.get(list.id)
    if (loaded) setOptions(loaded)
    else void loadOptions(list.options)
  }

  app.addEventListener(
    'click',
    (event) => {
      if (!(event.target instanceof Element)) return
      const add = event.target.closest<HTMLElement>('[data-add-option]')
      if (add?.dataset.addOption) return openPicker(add.dataset.addOption)

      if (event.target.closest('[data-picker-retry]') && !Array.isArray(list.options)) {
        void loadOptions(list.options)
        return
      }

      // Picking keeps the drawer open, so several options can go into the tier in a row;
      // "Add all" leaves nothing to pick, so it closes the drawer as they pop in.
      const pick = event.target.closest<HTMLElement>('[data-pick]')
      const pickAll = event.target.closest('[data-pick-all]')
      if ((pick?.dataset.pick || pickAll) && pickerTier) {
        const ids = pick?.dataset.pick
          ? [pick.dataset.pick]
          : pickableOf(tierState.get()).map((option) => option.id)
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

  // Search narrows the picker's grid down as you type.
  app.addEventListener(
    'input',
    (event) => {
      const search = event.target
      if (!(search instanceof HTMLInputElement) || !search.matches('[data-picker-search]')) return
      const items = pickerOf()?.querySelector<HTMLElement>('[data-picker-items]')
      if (!items || !pickerTier) return
      pickerQuery = search.value
      items.innerHTML = pickerItemsOf(pickerTier, tierState.get())
      items.scrollTop = 0
    },
    { signal },
  )

  // The list's filter checkbox narrows the grid down too.
  app.addEventListener(
    'change',
    (event) => {
      const checkbox = event.target
      if (!(checkbox instanceof HTMLInputElement) || !checkbox.matches('[data-picker-filter]'))
        return
      const items = pickerOf()?.querySelector<HTMLElement>('[data-picker-items]')
      if (!items || !pickerTier) return
      pickerFiltered = checkbox.checked
      items.innerHTML = pickerItemsOf(pickerTier, tierState.get())
      items.scrollTop = 0
    },
    { signal },
  )

  // Enter in the search adds the first match; Escape clears the search before closing the drawer.
  app.addEventListener(
    'keydown',
    (event) => {
      const search = event.target
      if (!(search instanceof HTMLInputElement) || !search.matches('[data-picker-search]')) return
      if (event.key === 'Enter' && !event.isComposing) {
        event.preventDefault()
        pickerOf()?.querySelector<HTMLElement>('[data-pick]')?.click()
      } else if (event.key === 'Escape' && search.value) {
        event.preventDefault()
        search.value = ''
        search.dispatchEvent(new Event('input', { bubbles: true }))
      }
    },
    { signal },
  )

  // Share: a dialog with a link to the list as it's ranked now, and a button copying it.
  const COPIED_MS = 2000
  let copiedTimer: ReturnType<typeof setTimeout> | undefined
  signal.addEventListener('abort', () => clearTimeout(copiedTimer), { once: true })
  const shareDialogOf = () => app.querySelector<HTMLDialogElement>('[data-share-dialog]')

  const openShareDialog = () => {
    const dialog = shareDialogOf()
    if (!dialog) return
    const state = tierState.get()
    const url = hasRankedOptions(state)
      ? location.origin + sharePath(list.id, encodeSelections(state, list.tiers, optionIds))
      : null
    dialog.innerHTML = shareDialog({ url })
    dialog.showModal()
    dialog.querySelector<HTMLElement>('[data-share-copy]')?.focus()
  }

  const copyShareLink = async (button: HTMLElement) => {
    const field = shareDialogOf()?.querySelector<HTMLInputElement>('[data-share-url]')
    if (!field) return
    try {
      await navigator.clipboard.writeText(field.value)
    } catch {
      // No clipboard access (e.g. an insecure origin): select the link to copy by hand.
      field.focus()
      field.select()
      return
    }
    clearTimeout(copiedTimer)
    button.toggleAttribute('data-copied', true)
    button.setAttribute('aria-label', 'Link copied')
    const label = button.querySelector('[data-share-copy-label]')
    if (label) label.textContent = 'Copied'
    copiedTimer = setTimeout(() => {
      button.toggleAttribute('data-copied', false)
      button.setAttribute('aria-label', 'Copy link')
      if (label) label.textContent = 'Copy'
    }, COPIED_MS)
  }

  app.addEventListener(
    'click',
    (event) => {
      if (!(event.target instanceof Element)) return
      if (event.target.closest('[data-share]')) return openShareDialog()
      const copy = event.target.closest<HTMLElement>('[data-share-copy]')
      if (copy) return void copyShareLink(copy)
      // Close on the X, or on a click on the backdrop, which targets the dialog itself.
      if (
        event.target.closest('[data-share-close]') ||
        event.target.matches('[data-share-dialog]')
      ) {
        shareDialogOf()?.close()
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

  /**
   * An off-screen copy of the tier list to capture, so it can be re-laid out
   * without the page moving: no ghost "+" and trash cells, no pop-in animation
   * (a fresh copy would replay it from invisible), and its natural height.
   * Remove its `host` when done.
   */
  const exportCopyOf = (node: HTMLElement) => {
    const host = document.createElement('div')
    host.setAttribute('aria-hidden', 'true')
    host.style.cssText = 'position: fixed; top: 0; left: -100000px;'
    const copy = node.cloneNode(true) as HTMLElement
    for (const el of copy.querySelectorAll('[data-add-option], [data-trash]')) el.remove()
    for (const el of copy.querySelectorAll('.dropped')) el.classList.remove('dropped')
    copy.style.height = 'auto'
    host.append(copy)
    document.body.append(host)
    return { host, copy }
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
      const { host, copy } = exportCopyOf(node)
      let dataUrl: string
      try {
        // A square: a sparse list widens to its height, a crowded one wraps its rows until it fits.
        const side = squareSide(
          (width) => {
            copy.style.width = `${width}px`
            return copy.scrollHeight
          },
          MIN_EXPORT_SIDE,
          node.scrollWidth,
        )
        // The rows stretch to fill the square's height.
        Object.assign(copy.style, { width: `${side}px`, height: `${side}px` })
        dataUrl = await toPng(copy, {
          pixelRatio: 2,
          backgroundColor: '#111111',
          width: side + 2 * EXPORT_MARGIN,
          height: side + 2 * EXPORT_MARGIN,
          // `width`/`height` above size the image, with a margin around the tier list.
          style: { width: `${side}px`, height: `${side}px`, margin: `${EXPORT_MARGIN}px` },
        })
      } finally {
        host.remove()
      }
      const link = document.createElement('a')
      link.download = `${list.id}.png`
      link.href = dataUrl
      link.click()
      track('png_exported', list.id)
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

  document.title = `${list.name} · tierlist.club`
  // The router mounts the returned markup synchronously, so it's in place by this microtask.
  queueMicrotask(() => mountSiteHeader(app, signal))

  return html`
    <div class="${themeClass} flex-col">
      ${siteHeader({
        links: tierLists.map((other) => ({
          href: tierListPath(other),
          label: other.label,
          title: other.name,
          active: other.id === list.id,
        })),
      })}
      <div class="relative flex-1 min-w-0 min-h-0">
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
            action: 'share',
            label: 'Share link',
            icon: SHARE_ICON,
            frame: 'border border-brand bg-background',
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
      <dialog
        data-share-dialog
        aria-labelledby="share-dialog-title"
        class="share-dialog scheme-dark m-auto w-[32rem] max-w-[calc(100vw-2rem)] p-0 rounded-2xl border border-white/10 bg-neutral-900 text-white shadow-2xl shadow-black/60"
      ></dialog>
    </div>
  `
}
