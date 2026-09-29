import assert from 'node:assert/strict'
import { decodeSelections, sharedParamsOf } from '../src/lib/share.ts'
import type { TierList, TierOption } from '../src/lib/tierlist.ts'
import { initialTierState, type TierState } from '../src/lib/tiers.ts'
import { tierListTools, type TierListHost } from '../src/lib/webmcp.ts'

const option = (id: string, name: string, released?: string): TierOption => ({
  id,
  name,
  image: '',
  released,
})
const listOf = (id: string, name: string, options: TierOption[]): TierList => ({
  id,
  name,
  label: name,
  title: name,
  description: '',
  about: '',
  tiers: ['S', 'A', 'B', 'C', 'D', 'F'],
  options,
})
const AGENTS = listOf('agents', 'AI agents', [
  option('claude', 'Claude Code'),
  option('codex', 'Codex'),
  option('cursor', 'Cursor'),
  option('kilo-code', 'Kilo Code'),
  option('roo-code', 'Roo Code'),
  option('zed', 'Zed'),
])
const MODELS = listOf('models', 'AI models', [
  option('anthropic/claude-opus-5-5', 'Claude Opus 5.5', '2026-08-01'),
  option('openai/gpt-6-sol', 'GPT-6 Sol', '2026-07-01'),
  option('openai/gpt-6-luna', 'GPT-6 Luna', '2026-07-01'),
])

/** The tools over an in-memory host, which records what they show and export. */
const setup = () => {
  const states = new Map<string, TierState>()
  const shown: string[] = []
  const exports: { list: string; download: boolean; pixelRatio: number }[] = []
  const host: TierListHost = {
    lists: [AGENTS, MODELS],
    shown: () => [AGENTS, MODELS].find((list) => list.id === shown.at(-1)),
    optionsOf: async (list) => list.options as TierOption[],
    stateOf: (list) => states.get(list.id) ?? initialTierState(list.tiers),
    update: (list, state) => {
      shown.push(list.id)
      states.set(list.id, state)
    },
    exportPng: async (list, { download, pixelRatio }) => {
      shown.push(list.id)
      exports.push({ list: list.id, download, pixelRatio })
      const side = 512 * pixelRatio
      return {
        dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
        fileName: `${list.id}.png`,
        width: side,
        height: side,
      }
    },
    origin: 'https://tierlist.club',
  }
  const tools = tierListTools(host)
  const call = (name: string, input: Record<string, unknown> = {}): Promise<any> => {
    const tool = tools.find((candidate) => candidate.name === name)
    assert.ok(tool, `no ${name} tool`)
    return Promise.resolve(tool.execute(input, { signal: new AbortController().signal }))
  }
  /** A list's tiers as `{ S: [ids…], … }`, leaving out the empty ones. */
  const ranking = (list: TierList) => {
    const state = host.stateOf(list)
    return Object.fromEntries(
      state.order
        .filter((tier) => state.items[tier].length)
        .map((tier) => [tier, state.items[tier]]),
    )
  }
  return { tools, call, ranking, shown, exports, states }
}

// --- the tools are valid WebMCP tools, and the read-only ones say so ---
{
  const { tools } = setup()
  assert.deepEqual(
    tools.map((tool) => tool.name),
    [
      'search_options',
      'get_tier_list',
      'create_tier_list',
      'rank_options',
      'remove_options',
      'share_tier_list',
      'export_tier_list_image',
    ],
  )
  for (const tool of tools) {
    assert.match(tool.name, /^[A-Za-z0-9_.-]{1,128}$/)
    assert.ok(tool.description.length > 20)
    assert.equal((tool.inputSchema as { type: string }).type, 'object')
    // The schema is JSON, as the browser serializes it.
    assert.deepEqual(JSON.parse(JSON.stringify(tool.inputSchema)), tool.inputSchema)
  }
  const readOnly = tools.filter((tool) => tool.annotations?.readOnlyHint).map((tool) => tool.name)
  assert.deepEqual(readOnly, ['search_options', 'get_tier_list', 'share_tier_list'])
  // The list ids and tiers are spelled out for the agent.
  const create = tools.find((tool) => tool.name === 'create_tier_list')!
  const schema = JSON.stringify(create.inputSchema)
  assert.ok(schema.includes('["agents","models"]'))
  assert.ok(schema.includes('S, A, B, C, D, and F'))
}

// --- search_options: by name or id, with release dates and tiers; the list on screen by default ---
{
  const { call } = setup()
  const found = await call('search_options', { query: 'code' })
  assert.equal(found.list, 'agents') // nothing on screen: the first list
  assert.equal(found.total, 4)
  assert.deepEqual(
    found.options.map((o: TierOption) => o.id),
    ['claude', 'codex', 'kilo-code', 'roo-code'],
  )
  const models = await call('search_options', { list: 'models', query: 'gpt 6' })
  assert.deepEqual(models.options, [
    { id: 'openai/gpt-6-sol', name: 'GPT-6 Sol', released: '2026-07-01' },
    { id: 'openai/gpt-6-luna', name: 'GPT-6 Luna', released: '2026-07-01' },
  ])
  // A limit; a blank query lists them all in order.
  const limited = await call('search_options', { list: 'agents', limit: 2 })
  assert.equal(limited.total, 6)
  assert.deepEqual(
    limited.options.map((o: TierOption) => o.id),
    ['claude', 'codex'],
  )
  assert.equal((await call('search_options', { limit: 0 })).options.length, 1)
  assert.equal((await call('search_options', { limit: 'lots' })).options.length, 6)
  // Once ranked, an option says where; and the list on screen is the default.
  await call('create_tier_list', { list: 'models', tiers: [{ tier: 'S', options: ['GPT-6 Sol'] }] })
  const ranked = await call('search_options', { query: 'sol' })
  assert.equal(ranked.list, 'models')
  assert.equal(ranked.options[0].tier, 'S')
  await assert.rejects(call('search_options', { list: 'films' }), /no 'films' tier list/)
}

// --- create_tier_list: replaces the ranking, adds in-between tiers, resolves names, and shows it ---
{
  const { call, ranking, shown } = setup()
  const result = await call('create_tier_list', {
    list: 'agents',
    tiers: [
      { tier: 'B--', options: ['zed'] },
      { tier: 'S', options: ['Claude Code', 'codex'] },
      { tier: 'a+', options: ['CURSOR'] },
      { tier: 'F', options: ['code', 'vim', 'claude'] },
    ],
  })
  assert.deepEqual(shown, ['agents'])
  assert.deepEqual(ranking(AGENTS), { S: ['claude', 'codex'], 'A+': ['cursor'], 'B--': ['zed'] })
  assert.deepEqual(
    result.tiers.map((tier: { tier: string }) => tier.tier),
    ['S', 'A+', 'A', 'B', 'B--', 'C', 'D', 'F'],
  )
  assert.deepEqual(result.tiers[0].options, [
    { id: 'claude', name: 'Claude Code' },
    { id: 'codex', name: 'Codex' },
  ])
  assert.equal(result.unranked, 2)
  assert.equal(result.warnings.length, 3)
  assert.match(
    result.warnings[0],
    /'code', which could be Claude Code \(claude\), Codex \(codex\), Kilo Code \(kilo-code\), and Roo Code \(roo-code\); name one by its id/,
  )
  assert.match(result.warnings[1], /'vim', which matches no option/)
  assert.match(result.warnings[2], /Claude Code came up more than once/)

  // Creating again starts over, dropping tiers and options it doesn't name.
  const again = await call('create_tier_list', {
    list: 'agents',
    tiers: { S: ['zed'], 'A−': 'kilo code' },
  })
  assert.deepEqual(ranking(AGENTS), { S: ['zed'], 'A-': ['kilo-code'] })
  assert.equal(again.warnings, undefined)
  assert.equal(again.tiers.length, 7)

  // A bad tier throws before anything changes.
  for (const tier of ['Z', 'A+-', 'A++++', '']) {
    await assert.rejects(
      call('create_tier_list', {
        list: 'agents',
        tiers: [
          { tier: 'S', options: ['codex'] },
          { tier, options: [] },
        ],
      }),
      /has no tier/,
    )
  }
  assert.deepEqual(ranking(AGENTS), { S: ['zed'], 'A-': ['kilo-code'] })

  // No tiers clears the list.
  const cleared = await call('create_tier_list', { list: 'agents', tiers: [] })
  assert.deepEqual(ranking(AGENTS), {})
  assert.equal(cleared.unranked, 6)
}

// --- rank_options: adds and moves options, in order, at the end or before another ---
{
  const { call, ranking } = setup()
  await call('create_tier_list', {
    list: 'agents',
    tiers: [{ tier: 'A', options: ['claude', 'codex', 'zed'] }],
  })
  await call('rank_options', { list: 'agents', tier: 'S', options: ['zed', 'cursor'] })
  assert.deepEqual(ranking(AGENTS), { S: ['zed', 'cursor'], A: ['claude', 'codex'] })
  await call('rank_options', { tier: 'S', options: ['Kilo Code', 'codex'], before: 'cursor' })
  assert.deepEqual(ranking(AGENTS), { S: ['zed', 'kilo-code', 'codex', 'cursor'], A: ['claude'] })
  // A new in-between tier; a `before` that isn't in the tier puts them at its end.
  const result = await call('rank_options', { tier: 'S+', options: ['roo code'], before: 'claude' })
  assert.deepEqual(ranking(AGENTS)['S+'], ['roo-code'])
  assert.match(result.warnings[0], /'claude' isn't in tier S\+/)
  await assert.rejects(call('rank_options', { tier: 'Q', options: ['zed'] }), /has no tier 'Q'/)
}

// --- remove_options: unranks them, noting ones that weren't ranked ---
{
  const { call, ranking } = setup()
  await call('create_tier_list', {
    list: 'agents',
    tiers: [{ tier: 'A', options: ['claude', 'codex'] }],
  })
  const result = await call('remove_options', { options: ['codex', 'zed', 'nope'] })
  assert.deepEqual(ranking(AGENTS), { A: ['claude'] })
  assert.equal(result.unranked, 5)
  assert.deepEqual(result.warnings, [
    "Skipped 'nope', which matches no option; search_options finds them.",
    "Zed wasn't ranked.",
  ])
}

// --- get_tier_list: the ranking now, without showing anything ---
{
  const { call, shown } = setup()
  const empty = await call('get_tier_list', { list: 'models' })
  assert.equal(empty.shown, false)
  assert.equal(empty.unranked, 3)
  assert.deepEqual(shown, [])
  await call('create_tier_list', { list: 'models', tiers: [{ tier: 'S', options: ['opus 5.5'] }] })
  const list = await call('get_tier_list')
  assert.equal(list.list, 'models')
  assert.equal(list.name, 'AI models')
  assert.equal(list.shown, true)
  assert.deepEqual(list.tiers[0], {
    tier: 'S',
    options: [{ id: 'anthropic/claude-opus-5-5', name: 'Claude Opus 5.5' }],
  })
}

// --- share_tier_list: a link that opens the ranking, once there is one ---
{
  const { call, states } = setup()
  await assert.rejects(call('share_tier_list', { list: 'agents' }), /Nothing is ranked/)
  await call('create_tier_list', {
    list: 'agents',
    tiers: [
      { tier: 'S+', options: ['claude'] },
      { tier: 'C', options: ['zed', 'cursor'] },
    ],
  })
  const { url } = await call('share_tier_list', { list: 'agents' })
  assert.ok(url.startsWith('https://tierlist.club/?type=agents&selections='))
  const params = sharedParamsOf(new URL(url).search)!
  assert.equal(params.type, 'agents')
  const ids = (AGENTS.options as TierOption[]).map((o) => o.id)
  assert.deepEqual(decodeSelections(params.selections, AGENTS.tiers, ids), states.get('agents'))
}

// --- export_tier_list_image: downloads by default, or hands the PNG back as MCP image content ---
{
  const { call, exports, shown } = setup()
  const downloaded = await call('export_tier_list_image', { list: 'models' })
  assert.deepEqual(downloaded, {
    list: 'models',
    downloaded: 'models.png',
    width: 1024,
    height: 1024,
  })
  assert.deepEqual(shown, ['models'])
  const image = await call('export_tier_list_image', { output: 'image' })
  assert.deepEqual(image.content[1], { type: 'image', mimeType: 'image/png', data: 'iVBORw0KGgo=' })
  assert.match(image.content[0].text, /models\.png, the AI models tier list as a 512×512 PNG/)
  assert.deepEqual(exports, [
    { list: 'models', download: true, pixelRatio: 2 },
    { list: 'models', download: false, pixelRatio: 1 },
  ])
  await assert.rejects(call('export_tier_list_image', { output: 'gif' }), /'download' or 'image'/)
}

console.log('webmcp tests passed')
