/** Slices the copy is cut into: more pour smoother, but cost more nodes. */
const STRIPS = 12
const STRIP_DURATION_MS = 380
/** Extra delay per strip of distance, so the strips farthest from the target pour in last. */
const STAGGER_MS = 22

/**
 * "Genie" effect: pours a copy of `source`, drawn at `from`, into the point
 * `to`, like smoke sucked into a lamp. The copy is sliced across its direction
 * of travel (rows when the target is mostly above or below, columns when it's
 * to the side), and the slices each narrow and shrink into the point, the ones
 * nearest to it first, so the copy funnels in. Resolves once the last slice is
 * in; `source` itself is left alone.
 */
export const genie = async (
  source: HTMLElement,
  from: DOMRect,
  to: { x: number; y: number },
): Promise<void> => {
  const layer = document.createElement('div')
  layer.setAttribute('aria-hidden', 'true')
  layer.style.cssText = 'position: fixed; inset: 0; z-index: 50; pointer-events: none'

  const rows =
    Math.abs(to.y - (from.top + from.height / 2)) >= Math.abs(to.x - (from.left + from.width / 2))
  const stripSize = (rows ? from.height : from.width) / STRIPS

  const strips = Array.from({ length: STRIPS }, (_, i) => {
    const strip = source.cloneNode(true) as HTMLElement
    // Each slice overlaps its neighbors by a pixel, so no seams show between them.
    const start = `calc(${(i / STRIPS) * 100}% - 1px)`
    const end = `calc(${100 - ((i + 1) / STRIPS) * 100}% - 1px)`
    const middle = `${(i + 0.5) * (100 / STRIPS)}%`
    Object.assign(strip.style, {
      position: 'absolute',
      left: `${from.left}px`,
      top: `${from.top}px`,
      width: `${from.width}px`,
      height: `${from.height}px`,
      margin: '0',
      transition: 'none',
      transform: 'none',
      clipPath: rows ? `inset(${start} 0 ${end} 0)` : `inset(0 ${end} 0 ${start})`,
      transformOrigin: rows ? `50% ${middle}` : `${middle} 50%`,
    })
    layer.append(strip)
    return strip
  })
  document.body.append(layer)

  const offsets = strips.map((_, i) => ({
    dx: to.x - (from.left + (rows ? from.width / 2 : (i + 0.5) * stripSize)),
    dy: to.y - (from.top + (rows ? (i + 0.5) * stripSize : from.height / 2)),
  }))
  const distances = offsets.map(({ dx, dy }) => Math.abs(rows ? dy : dx))
  const nearest = Math.min(...distances)

  const animations = strips.map((strip, i) => {
    const { dx, dy } = offsets[i]
    // Across the travel lags behind along it, so the stream curves into the target.
    const halfway = rows
      ? `translate(${dx * 0.3}px, ${dy * 0.55}px) scale(0.55, 0.9)`
      : `translate(${dx * 0.55}px, ${dy * 0.3}px) scale(0.9, 0.55)`
    return strip.animate(
      [
        { transform: 'translate(0, 0) scale(1, 1)', opacity: 1 },
        { offset: 0.5, transform: halfway, opacity: 1 },
        {
          transform: `translate(${dx}px, ${dy}px) ${rows ? 'scale(0.04, 0.3)' : 'scale(0.3, 0.04)'}`,
          opacity: 0,
        },
      ],
      {
        duration: STRIP_DURATION_MS,
        delay: ((distances[i] - nearest) / stripSize) * STAGGER_MS,
        easing: 'cubic-bezier(0.55, 0, 0.85, 0.35)',
        fill: 'forwards',
      },
    )
  })

  try {
    await Promise.all(animations.map((animation) => animation.finished))
  } finally {
    layer.remove()
  }
}
