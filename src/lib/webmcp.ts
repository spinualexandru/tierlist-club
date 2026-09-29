// WebMCP tools (https://webmachinelearning.github.io/webmcp/), which let an AI
// agent in the browser make tier lists on the page: find the options, rank
// them into tiers, get a share link, and save the PNG. They act through a
// `TierListHost`, which src/views/tierlist.ts implements on the app, so they
// stay pure enough to test in Node.

import { encodeSelections, sharePath } from './share.ts'
import { matchOption, searchOptions, type TierList, type TierOption } from './tierlist.ts'
import {
  addOptions,
  addTier,
  baseTierOf,
  hasRankedOptions,
  initialTierState,
  isBaseTier,
  moveOption,
  removeOption,
  unrankedOptions,
  type TierState,
} from './tiers.ts'

/** A captured tier list, as a `data:image/png;base64,…` URL. */
export interface Png {
  dataUrl: string
  fileName: string
  width: number
  height: number
}

/** What the tools act on: the tier lists, and the page showing them. */
export interface TierListHost {
  lists: TierList[]
  /** The list on screen, if one is. */
  shown: () => TierList | undefined
  /** A list's options, loading them first if it loads its own. */
  optionsOf: (list: TierList) => Promise<TierOption[]>
  stateOf: (list: TierList) => TierState
  /** Put the list on screen, then change its state, so the user sees the change. */
  update: (list: TierList, state: TierState) => void
  /** Put the list on screen and capture it as a square PNG, saving it as a download if `download`. */
  exportPng: (list: TierList, options: { download: boolean; pixelRatio: number }) => Promise<Png>
  /** Where share links point, e.g. 'https://tierlist.club'. */
  origin: string
}

/** The most +/- modifiers a tier an agent adds can have, as in 'A+++'. */
const MAX_MODIFIERS = 3
/** How many options `search_options` returns, unless it's asked for up to `MAX_SEARCH_LIMIT`. */
const SEARCH_LIMIT = 20
const MAX_SEARCH_LIMIT = 100
/** How many of the options an ambiguous name could be a warning names. */
const MAX_CANDIDATES = 5

/** 'a, b, and c'. */
const listed = (items: string[]): string =>
  items.length < 3 ? items.join(' and ') : `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`

/** Non-blank strings from an agent's argument, taking a lone string as a list of one. */
const stringsOf = (value: unknown): string[] =>
  (Array.isArray(value) ? value : [value]).filter(
    (item): item is string => typeof item === 'string' && item.trim() !== '',
  )

/**
 * `create_tier_list`'s tiers: `[{ tier, options }]` as its schema asks, or
 * an object from tier id to options, which agents tend to send too.
 */
const placementsOf = (value: unknown): { tier: unknown; options: unknown }[] => {
  if (Array.isArray(value))
    return value.map((entry) => ({ tier: entry?.tier, options: entry?.options }))
  if (value && typeof value === 'object')
    return Object.entries(value).map(([tier, options]) => ({ tier, options }))
  return []
}

const describe = (option: TierOption): string => `${option.name} (${option.id})`

/**
 * The tools, as `document.modelContext.registerTool` takes them. The browser
 * hands their results to the agent as JSON; a failure throws, changing nothing.
 */
export const tierListTools = (host: TierListHost): WebMCP.ModelContextTool[] => {
  const bases = [...new Set(host.lists.flatMap((list) => list.tiers.filter(isBaseTier)))]

  /** The list an agent named, or the one on screen (else the first) if it didn't name one. */
  const listOf = (id: unknown): TierList => {
    if (id === undefined || id === null || id === '') return host.shown() ?? host.lists[0]
    const list = host.lists.find((candidate) => candidate.id === id)
    if (list) return list
    throw new Error(
      `There's no '${id}' tier list. The lists are ${listed(host.lists.map((list) => `'${list.id}'`))}.`,
    )
  }

  /**
   * `state` with an agent's tier in it, adding an in-between tier like 'A+'
   * if needed, and the tier's id as the list has it: 's' is 'S', 'A−' is 'A-'.
   */
  const withTier = (list: TierList, state: TierState, tier: unknown) => {
    const asked = String(tier ?? '')
      .trim()
      .replaceAll('−', '-')
    const base = baseTierOf(asked)
    const listBases = state.order.map(baseTierOf)
    const listBase = listBases.includes(base)
      ? base
      : listBases.find((id) => id.toLowerCase() === base.toLowerCase())
    const tierId = (listBase ?? base) + asked.slice(base.length)
    if (state.order.includes(tierId)) return { state, tierId }
    const next = tierId.length - base.length <= MAX_MODIFIERS ? addTier(state, tierId) : state
    if (next.order.includes(tierId)) return { state: next, tierId }
    throw new Error(
      `The ${list.name} tier list has no tier '${asked}'. Its tiers are ${listed(state.order)}; an in-between tier has up to ${MAX_MODIFIERS} + or - after one of them, like A+ or B--.`,
    )
  }

  /** The options an agent named, noting in `warnings` the names that match none or several. */
  const resolve = (options: TierOption[], refs: unknown, warnings: string[]): TierOption[] =>
    stringsOf(refs).flatMap((ref) => {
      const match = matchOption(options, ref)
      if ('option' in match) return [match.option]
      const { candidates } = match
      const more = candidates.length - MAX_CANDIDATES
      warnings.push(
        candidates.length === 0
          ? `Skipped '${ref}', which matches no option; search_options finds them.`
          : `Skipped '${ref}', which could be ${listed([
              ...candidates.slice(0, MAX_CANDIDATES).map(describe),
              ...(more > 0 ? [`${more} more`] : []),
            ])}; name one by its id.`,
      )
      return []
    })

  /** A list's tiers, best first, with the id and name of each option in them. */
  const rankingOf = (state: TierState, options: TierOption[]) => {
    const byId = new Map(options.map((option) => [option.id, option] as const))
    return state.order.map((tier) => ({
      tier,
      options: (state.items[tier] ?? []).flatMap((id) => {
        const option = byId.get(id)
        return option ? [{ id, name: option.name }] : []
      }),
    }))
  }

  /** What a tool changing a list reports: its ranking now, and anything it skipped. */
  const summaryOf = (
    list: TierList,
    state: TierState,
    options: TierOption[],
    warnings: string[] = [],
  ) => ({
    list: list.id,
    tiers: rankingOf(state, options),
    unranked: unrankedOptions(
      state,
      options.map((option) => option.id),
    ).length,
    ...(warnings.length > 0 ? { warnings } : {}),
  })

  const listProperty = {
    type: 'string',
    enum: host.lists.map((list) => list.id),
    description: `The tier list: ${listed(host.lists.map((list) => `'${list.id}' (${list.name})`))}. Defaults to the one on screen.`,
  }
  const tierProperty = {
    type: 'string',
    description: `A tier: ${listed(bases)}, best to worst, or an in-between one with up to ${MAX_MODIFIERS} + or - after it, like A+ or B--, which goes right above (+) or below (-) its tier.`,
  }
  const optionsProperty = (description: string) => ({
    type: 'array',
    items: { type: 'string' },
    description: `${description} Each is an id or a name, as search_options returns them.`,
  })

  return [
    {
      name: 'search_options',
      title: 'Search options',
      description:
        'Search the options a tier list ranks, like AI models or coding agents, by name or id. Returns their ids and names, their release dates if known, and the tier of any that are ranked. Without a query, lists them in the order the page offers them: for models, featured flagships first, then the newest.',
      inputSchema: {
        type: 'object',
        properties: {
          list: listProperty,
          query: {
            type: 'string',
            description: 'Part of a name or id, ignoring case, spaces, and punctuation.',
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: MAX_SEARCH_LIMIT,
            description: `The most options to return; ${SEARCH_LIMIT} by default.`,
          },
        },
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async ({ list: id, query, limit } = {}) => {
        const list = listOf(id)
        const options = await host.optionsOf(list)
        const state = host.stateOf(list)
        const tierOf = new Map(
          state.order.flatMap((tier) => (state.items[tier] ?? []).map((id) => [id, tier] as const)),
        )
        const matches = searchOptions(options, typeof query === 'string' ? query : '')
        const count = Number.isInteger(limit)
          ? Math.min(Math.max(Number(limit), 1), MAX_SEARCH_LIMIT)
          : SEARCH_LIMIT
        return {
          list: list.id,
          total: matches.length,
          options: matches.slice(0, count).map(({ id, name, released }) => ({
            id,
            name,
            ...(released ? { released } : {}),
            ...(tierOf.has(id) ? { tier: tierOf.get(id) } : {}),
          })),
        }
      },
    },
    {
      name: 'get_tier_list',
      title: 'Get tier list',
      description:
        "Get a tier list's ranking as it is now: its tiers, best to worst, with the options in each in order, and how many options are still unranked.",
      inputSchema: { type: 'object', properties: { list: listProperty } },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async ({ list: id } = {}) => {
        const list = listOf(id)
        const options = await host.optionsOf(list)
        return {
          ...summaryOf(list, host.stateOf(list), options),
          name: list.name,
          shown: host.shown() === list,
        }
      },
    },
    {
      name: 'create_tier_list',
      title: 'Create tier list',
      description:
        'Rank a whole tier list at once, replacing its ranking, and show it on the page. Give its tiers with the options in each, best first; tiers you leave out stay empty and options you leave out stay unranked, so an empty tiers array clears the list. Options that match nothing, or several, are skipped and reported in warnings.',
      inputSchema: {
        type: 'object',
        properties: {
          list: listProperty,
          tiers: {
            type: 'array',
            description: 'The tiers to fill, in any order.',
            items: {
              type: 'object',
              properties: {
                tier: tierProperty,
                options: optionsProperty('The options in the tier, best first.'),
              },
              required: ['tier', 'options'],
            },
          },
        },
        required: ['tiers'],
      },
      execute: async ({ list: id, tiers } = {}) => {
        const list = listOf(id)
        const options = await host.optionsOf(list)
        let state = initialTierState(list.tiers)
        // Every tier first, so a bad one throws before anything changes.
        const placements = placementsOf(tiers).map(({ tier, options: refs }) => {
          const added = withTier(list, state, tier)
          state = added.state
          return { tierId: added.tierId, refs }
        })
        const warnings: string[] = []
        for (const { tierId, refs } of placements) {
          for (const option of resolve(options, refs, warnings)) {
            const next = addOptions(state, [option.id], tierId)
            if (next === state)
              warnings.push(`${option.name} came up more than once; it's in the first tier given.`)
            state = next
          }
        }
        host.update(list, state)
        return summaryOf(list, state, options, warnings)
      },
    },
    {
      name: 'rank_options',
      title: 'Rank options',
      description:
        "Put options into a tier of a tier list and show it on the page: unranked options get added, and ranked ones move. They keep the order given, at the end of the tier or in front of the option given as before. An in-between tier like A+ gets added if it isn't there yet.",
      inputSchema: {
        type: 'object',
        properties: {
          list: listProperty,
          tier: tierProperty,
          options: { ...optionsProperty('The options to put in the tier, in order.'), minItems: 1 },
          before: {
            type: 'string',
            description:
              'An option in the tier to put them in front of, by id or name. They go at the end of the tier without it.',
          },
        },
        required: ['tier', 'options'],
      },
      execute: async ({ list: id, tier, options: refs, before } = {}) => {
        const list = listOf(id)
        const options = await host.optionsOf(list)
        let { state, tierId } = withTier(list, host.stateOf(list), tier)
        const warnings: string[] = []
        let beforeId: string | undefined
        if (typeof before === 'string' && before.trim()) {
          const match = matchOption(options, before)
          if ('option' in match && state.items[tierId]?.includes(match.option.id))
            beforeId = match.option.id
          else warnings.push(`'${before}' isn't in tier ${tierId}, so they went at its end.`)
        }
        for (const option of resolve(options, refs, warnings))
          state = moveOption(state, option.id, tierId, beforeId)
        host.update(list, state)
        return summaryOf(list, state, options, warnings)
      },
    },
    {
      name: 'remove_options',
      title: 'Remove options',
      description:
        'Take options off a tier list, so they are unranked again, and show it on the page.',
      inputSchema: {
        type: 'object',
        properties: {
          list: listProperty,
          options: { ...optionsProperty('The options to take off.'), minItems: 1 },
        },
        required: ['options'],
      },
      execute: async ({ list: id, options: refs } = {}) => {
        const list = listOf(id)
        const options = await host.optionsOf(list)
        let state = host.stateOf(list)
        const warnings: string[] = []
        for (const option of resolve(options, refs, warnings)) {
          const next = removeOption(state, option.id)
          if (next === state) warnings.push(`${option.name} wasn't ranked.`)
          state = next
        }
        host.update(list, state)
        return summaryOf(list, state, options, warnings)
      },
    },
    {
      name: 'share_tier_list',
      title: 'Share tier list',
      description:
        "Get a link that opens a tier list as it's ranked now, for anyone. Later changes don't show up in it, so get a new link after changing the list. The list needs at least one ranked option.",
      inputSchema: { type: 'object', properties: { list: listProperty } },
      annotations: { readOnlyHint: true },
      execute: async ({ list: id } = {}) => {
        const list = listOf(id)
        const state = host.stateOf(list)
        if (!hasRankedOptions(state))
          throw new Error(`Nothing is ranked in the ${list.name} tier list yet.`)
        const options = await host.optionsOf(list)
        const selections = encodeSelections(
          state,
          list.tiers,
          options.map((option) => option.id),
        )
        return { list: list.id, url: host.origin + sharePath(list.id, selections) }
      },
    },
    {
      name: 'export_tier_list_image',
      title: 'Export tier list image',
      description:
        "Save a tier list as a square PNG image, like the page's Save as PNG button, and show it on the page. By default the PNG downloads to the user's device. With output 'image' it comes back in the result instead, as MCP image content with the base64 PNG data (often a few hundred KB), so ask for that only if you can take images.",
      inputSchema: {
        type: 'object',
        properties: {
          list: listProperty,
          output: {
            type: 'string',
            enum: ['download', 'image'],
            description:
              "'download' (the default) saves the PNG to the user's device; 'image' returns it.",
          },
        },
      },
      execute: async ({ list: id, output = 'download' } = {}) => {
        const list = listOf(id)
        if (output !== 'download' && output !== 'image')
          throw new Error(`output is 'download' or 'image', not '${output}'.`)
        const download = output === 'download'
        // Full resolution for the user; half that is plenty for an agent to look at.
        const png = await host.exportPng(list, { download, pixelRatio: download ? 2 : 1 })
        if (download)
          return { list: list.id, downloaded: png.fileName, width: png.width, height: png.height }
        return {
          content: [
            {
              type: 'text',
              text: `${png.fileName}, the ${list.name} tier list as a ${png.width}×${png.height} PNG.`,
            },
            {
              type: 'image',
              mimeType: 'image/png',
              data: png.dataUrl.slice(png.dataUrl.indexOf(',') + 1),
            },
          ],
        }
      },
    },
  ]
}
