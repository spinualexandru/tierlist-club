/** The switcher's pill when the previous list was left: where it was, and which link it was under. */
let lastPill: { rect: DOMRect; href: string | null } | null = null

const SLIDE_DURATION_MS = 350
const SLIDE_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'

/**
 * Wires up the site header once it's mounted in `root`. Every route renders a
 * fresh header, so the switcher's pill slides over from where it was on the
 * list just left (FLIP), with the two labels trading text colors as it passes,
 * and remembers where it is when this route is left in turn.
 */
export const mountSiteHeader = (root: HTMLElement, signal: AbortSignal) => {
  const pill = root.querySelector<HTMLElement>('[data-switch-pill]')
  const link = pill?.closest<HTMLElement>('a')
  if (!pill || !link) return

  // On abort the old markup is still mounted, so the pill can be measured.
  signal.addEventListener(
    'abort',
    () => (lastPill = { rect: pill.getBoundingClientRect(), href: link.getAttribute('href') }),
    { once: true },
  )

  const from = lastPill
  lastPill = null
  if (!from || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const to = pill.getBoundingClientRect()
  if (from.rect.left === to.left && from.rect.right === to.right) return

  const timing = { duration: SLIDE_DURATION_MS, easing: SLIDE_EASING }
  // Animating the insets rather than a scale keeps the pill's rounded ends round.
  pill.animate(
    [
      { left: `${from.rect.left - to.left}px`, right: `${to.right - from.rect.right}px` },
      { left: '0px', right: '0px' },
    ],
    timing,
  )

  const previous = from.href
    ? root.querySelector<HTMLElement>(`nav a[href="${CSS.escape(from.href)}"]`)
    : null
  if (!previous || previous === link) return
  const onPill = getComputedStyle(link).color
  const offPill = getComputedStyle(previous).color
  link.animate([{ color: offPill }, { color: onPill }], timing)
  previous.animate([{ color: onPill }, { color: offPill }], timing)
}
