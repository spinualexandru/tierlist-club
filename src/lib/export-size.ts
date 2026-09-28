/**
 * Side of a square that fits content whose height depends on its width
 * (rows wrap more as it narrows, so `heightAt` never grows with the width).
 *
 * - Content taller than `maxWidth` is widened to its height.
 * - Otherwise it's narrowed, wrapping rows, to the smallest width it fits
 *   within as a square, never below `minSide`.
 */
export const squareSide = (
  heightAt: (width: number) => number,
  minSide: number,
  maxWidth: number,
): number => {
  const tallest = heightAt(maxWidth)
  if (tallest >= maxWidth) return Math.max(minSide, Math.ceil(tallest))
  if (heightAt(minSide) <= minSide) return minSide

  // heightAt(lo) > lo and heightAt(hi) <= hi: close in on the smallest width that fits.
  let lo = minSide
  let hi = Math.ceil(maxWidth)
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2)
    if (heightAt(mid) <= mid) hi = mid
    else lo = mid
  }
  return hi
}
