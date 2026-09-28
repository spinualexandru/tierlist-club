import { baseTierOf, initialTierState, isBaseTier, type TierState } from './tiers.ts'

/*
 * A shared tier list travels in its URL: `/?type=<list id>&selections=<base64url>`.
 * The selections are bytes, base64url-encoded without padding:
 *
 * - a header byte: the format version (high nibble), and how many bytes of
 *   each option id's hash follow (low nibble);
 * - the tier count as a varint, 0 for the list's configured tiers, else
 *   followed by that many tier codes (a varint each, see `tierCode`);
 * - per tier, in order: its option count as a varint, then each option's id hash.
 *
 * Hashes rather than indices keep links working while options come and go
 * (models.dev adds models all the time): the decoder hashes the options the
 * list has now and matches. Unknown hashes are dropped, so a link outlives a
 * model that's gone.
 */

/** Query parameter naming the shared tier list. */
export const SHARE_TYPE_PARAM = 'type'
/** Query parameter holding the shared tiers and their options. */
export const SHARE_SELECTIONS_PARAM = 'selections'

const VERSION = 1
/** Bytes of each id hash: the fewest that tell the ranked options apart from every other one. */
const MIN_HASH_BYTES = 3
const MAX_HASH_BYTES = 8
/** The most +/- modifiers a shared tier can have, so a crafted link can't build a huge tier id. */
const MAX_MODIFIERS = 32

const MASK_64 = (1n << 64n) - 1n
const hashes = new Map<string, string>()

/** A 64-bit hash of an option id, as 16 hex digits: FNV-1a, then murmur3's finalizer to mix it. */
const idHash = (id: string): string => {
  const cached = hashes.get(id)
  if (cached) return cached
  let hash = 0xcbf29ce484222325n
  for (const byte of new TextEncoder().encode(id)) {
    hash = ((hash ^ BigInt(byte)) * 0x100000001b3n) & MASK_64
  }
  hash ^= hash >> 33n
  hash = (hash * 0xff51afd7ed558ccdn) & MASK_64
  hash ^= hash >> 33n
  hash = (hash * 0xc4ceb9fe1a85ec53n) & MASK_64
  hash ^= hash >> 33n
  const hex = hash.toString(16).padStart(16, '0')
  hashes.set(id, hex)
  return hex
}

/** The first `bytes` bytes of an id's hash, as hex. */
const hashOf = (id: string, bytes: number): string => idHash(id).slice(0, bytes * 2)

/** Option ids by their `bytes`-byte hash, with null for a hash that more than one id shares. */
const idsByHash = (optionIds: Iterable<string>, bytes: number): Map<string, string | null> => {
  const byHash = new Map<string, string | null>()
  for (const id of optionIds) {
    const hash = hashOf(id, bytes)
    byHash.set(hash, byHash.has(hash) && byHash.get(hash) !== id ? null : id)
  }
  return byHash
}

/** The fewest hash bytes at which none of the `ranked` ids shares its hash with another option. */
const hashBytesFor = (ranked: string[], optionIds: string[]): number => {
  const all = new Set([...optionIds, ...ranked])
  for (let bytes = MIN_HASH_BYTES; bytes < MAX_HASH_BYTES; bytes++) {
    const byHash = idsByHash(all, bytes)
    if (ranked.every((id) => byHash.get(hashOf(id, bytes)) === id)) return bytes
  }
  return MAX_HASH_BYTES
}

/** Unique base tiers of a list's configured tiers, in order; tier codes index into them. */
const basesOf = (tiers: string[]): string[] => [...new Set(tiers.map(baseTierOf))]

/**
 * A tier id as one number: its base tier's index among `bases`, then its
 * modifiers (twice their count, plus 1 for '-'), so a base tier or one with
 * a few modifiers still fits in a single varint byte.
 */
const tierCode = (tierId: string, bases: string[]): number => {
  const base = baseTierOf(tierId)
  const modifiers = tierId.slice(base.length)
  const at = bases.indexOf(base)
  if (at === -1 || modifiers.length > MAX_MODIFIERS || /\+-|-\+/.test(modifiers))
    throw new Error(`Tier ${tierId} can't be shared`)
  return (modifiers.length * 2 + (modifiers.startsWith('-') ? 1 : 0)) * bases.length + at
}

/** The tier id a `tierCode` stands for, or null if it's out of range. */
const tierIdOf = (code: number, bases: string[]): string | null => {
  const base = bases[code % bases.length]
  const modifiers = Math.floor(code / bases.length)
  const count = modifiers >> 1
  const minus = modifiers & 1
  if (count > MAX_MODIFIERS || (count === 0 && minus)) return null
  return base + (minus ? '-' : '+').repeat(count)
}

const writeVarint = (out: number[], value: number) => {
  while (value >= 0x80) {
    out.push((value & 0x7f) | 0x80)
    value >>>= 7
  }
  out.push(value)
}

const writeHash = (out: number[], hex: string) => {
  for (let at = 0; at < hex.length; at += 2) out.push(parseInt(hex.slice(at, at + 2), 16))
}

/** Reads bytes front to back, throwing once they run out. */
const readerOf = (bytes: Uint8Array) => {
  let at = 0
  const byte = (): number => {
    if (at >= bytes.length) throw new RangeError('Truncated selections')
    return bytes[at++]
  }
  return {
    byte,
    /** An unsigned varint of up to 4 bytes (28 bits). */
    varint: (): number => {
      let value = 0
      for (let shift = 0; shift < 28; shift += 7) {
        const next = byte()
        value |= (next & 0x7f) << shift
        if (next < 0x80) return value
      }
      throw new RangeError('Varint too long')
    },
    hash: (length: number): string =>
      Array.from({ length }, () => byte().toString(16).padStart(2, '0')).join(''),
    get done() {
      return at === bytes.length
    },
  }
}

const toBase64Url = (bytes: number[]): string =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')

/** Decodes URL-safe or standard base64, padded or not; null if it isn't base64. */
const fromBase64Url = (encoded: string): Uint8Array | null => {
  try {
    // A standard '+' that went through a query string unescaped comes back as a space.
    const base64 = encoded.trim().replaceAll(' ', '+').replaceAll('-', '+').replaceAll('_', '/')
    return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
  } catch {
    return null
  }
}

/**
 * The `selections` value for a tier state of a list with the given configured
 * `tiers` and `optionIds`, which pick the tier codes and how long the hashes are.
 */
export const encodeSelections = (
  state: TierState,
  tiers: string[],
  optionIds: string[],
): string => {
  const ranked = state.order.flatMap((tierId) => state.items[tierId] ?? [])
  const hashBytes = hashBytesFor(ranked, optionIds)
  const out = [(VERSION << 4) | hashBytes]

  const configured = state.order.join() === initialTierState(tiers).order.join()
  writeVarint(out, configured ? 0 : state.order.length)
  if (!configured) {
    const bases = basesOf(tiers)
    for (const tierId of state.order) writeVarint(out, tierCode(tierId, bases))
  }

  for (const tierId of state.order) {
    const items = state.items[tierId] ?? []
    writeVarint(out, items.length)
    for (const id of items) writeHash(out, hashOf(id, hashBytes))
  }
  return toBase64Url(out)
}

/** The path and query a tier list is shared at, e.g. `/?type=models&selections=…`. */
export const sharePath = (listId: string, selections: string): string =>
  `/?${new URLSearchParams({
    [SHARE_TYPE_PARAM]: listId,
    [SHARE_SELECTIONS_PARAM]: selections,
  })}`

/** The list id and selections of a shared tier list's query string, if it has both. */
export const sharedParamsOf = (search: string): { type: string; selections: string } | null => {
  const params = new URLSearchParams(search)
  const type = params.get(SHARE_TYPE_PARAM)
  const selections = params.get(SHARE_SELECTIONS_PARAM)
  return type && selections ? { type, selections } : null
}

const decode = (bytes: Uint8Array, tiers: string[], optionIds: string[]): TierState | null => {
  const read = readerOf(bytes)
  const header = read.byte()
  const hashBytes = header & 0x0f
  if (header >> 4 !== VERSION || hashBytes < MIN_HASH_BYTES || hashBytes > MAX_HASH_BYTES)
    return null

  const tierCount = read.varint()
  let order: string[]
  if (tierCount === 0) order = initialTierState(tiers).order
  else {
    const bases = basesOf(tiers)
    order = []
    for (let i = 0; i < tierCount; i++) {
      const tierId = tierIdOf(read.varint(), bases)
      if (!tierId || order.includes(tierId)) return null
      order.push(tierId)
    }
  }
  if (!tiers.filter(isBaseTier).every((base) => order.includes(base))) return null

  const byHash = idsByHash(optionIds, hashBytes)
  const placed = new Set<string>()
  const items: Record<string, string[]> = {}
  for (const tierId of order) {
    items[tierId] = []
    const count = read.varint()
    for (let i = 0; i < count; i++) {
      const id = byHash.get(read.hash(hashBytes))
      if (!id || placed.has(id)) continue
      placed.add(id)
      items[tierId].push(id)
    }
  }

  if (!read.done || placed.size === 0) return null
  return { order, items }
}

/**
 * The tier state a `selections` value describes, for a list with the given
 * configured `tiers` and `optionIds`. Null unless it's valid: a known format
 * version, no bytes missing or left over, no tier twice, the list's configured
 * base tiers all there (they can't be deleted), and at least one known option
 * ranked. Hashes that match no option, or more than one (an option added since
 * that collides), are dropped, as are repeats of an option after its first.
 */
export const decodeSelections = (
  selections: string,
  tiers: string[],
  optionIds: string[],
): TierState | null => {
  const bytes = fromBase64Url(selections)
  if (!bytes) return null
  try {
    return decode(bytes, tiers, optionIds)
  } catch {
    return null
  }
}
