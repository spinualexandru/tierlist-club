import assert from 'node:assert/strict'
import { squareSide } from '../src/lib/export-size.ts'

/** Six rows of 100px cells in a 100px-tall line each, after a 200px letter column. */
const rowsOf = (cells: number[]) => (width: number) => {
  const perLine = Math.max(1, Math.floor((width - 200) / 100))
  return cells.reduce((sum, n) => sum + Math.max(1, Math.ceil(n / perLine)) * 100, 0)
}
const calls = (heightAt: (width: number) => number) => {
  let count = 0
  return [(width: number) => (count++, heightAt(width)), () => count] as const
}

// --- few options: the list is taller than wide, so it widens to its height ---
assert.equal(squareSide(rowsOf([2, 1, 0, 0, 0, 0]), 480, 1600), 600)

// --- a crowded tier: rows wrap until the list is about as tall as it is wide ---
const crowded = rowsOf([40, 5, 0, 0, 0, 0])
const side = squareSide(crowded, 480, 1600)
assert.ok(crowded(side) <= side, 'fits within the square')
assert.ok(crowded(side - 1) > side - 1, 'and no narrower square fits')

// --- never smaller than the minimum ---
assert.equal(
  squareSide(() => 100, 480, 1600),
  480,
)

// --- content taller than any width still makes a square ---
assert.equal(
  squareSide(() => 3000, 480, 1600),
  3000,
)

// --- it's a binary search, not a scan ---
const [counted, count] = calls(crowded)
squareSide(counted, 480, 1600)
assert.ok(count() <= 14, `measured ${count()} times`)

console.log('export size: all assertions passed')
