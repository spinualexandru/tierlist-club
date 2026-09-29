import assert from 'node:assert/strict'
import { Effect } from 'effect'
import {
  absoluteUrl,
  headTags,
  llmsTxt,
  notFoundHeadTags,
  pageTitle,
  prerenderedBody,
  sitemapXml,
  type Page,
} from '../src/lib/seo.ts'
import type { TierList } from '../src/lib/tierlist.ts'

const agents: TierList = {
  id: 'agents',
  name: 'AI agents',
  label: 'Agents',
  title: 'Agent Tier List Maker',
  description: 'Rank "agents" & <tools>.',
  about: 'Agents write code.',
  tiers: ['S', 'A', 'F'],
  options: [
    { id: 'amp', name: 'Amp', image: '/amp.svg' },
    { id: 'pi', name: 'Pi & Co', image: '/pi.svg' },
  ],
}
const models: TierList = {
  id: 'models',
  name: 'AI models',
  label: 'Models',
  title: 'Model Tier List Maker',
  description: 'Rank models.',
  about: 'Loaded from models.dev.',
  tiers: ['S', 'A', 'F'],
  options: Effect.succeed([]),
}
const pages: Page[] = [
  { list: agents, path: '/' },
  { list: models, path: '/models' },
]

// --- URLs and titles ---
assert.equal(absoluteUrl('/'), 'https://tierlist.club/')
assert.equal(absoluteUrl('/models'), 'https://tierlist.club/models')
assert.equal(pageTitle(models), 'Model Tier List Maker · tierlist.club')

// --- head tags: escaped, canonical, previews, and parseable schema.org data ---
const head = headTags(pages[0])
assert.ok(head.includes('<title>Agent Tier List Maker · tierlist.club</title>'))
assert.ok(head.includes('content="Rank &quot;agents&quot; &amp; &lt;tools&gt;."'))
assert.ok(head.includes('<link rel="canonical" href="https://tierlist.club/" />'))
assert.ok(head.includes('<meta property="og:url" content="https://tierlist.club/" />'))
assert.ok(head.includes('<meta property="og:image" content="https://tierlist.club/og.png" />'))
assert.ok(headTags(pages[1]).includes('href="https://tierlist.club/models"'))
const ld = head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
assert.ok(ld)
assert.ok(!ld[1].includes('<'), 'no raw < inside the JSON-LD script')
const graph = JSON.parse(ld[1])['@graph']
assert.deepEqual(
  graph.map((node: { '@type': string }) => node['@type']),
  ['WebSite', 'WebApplication'],
)
assert.equal(graph[1].description, 'Rank "agents" & <tools>.')
assert.equal(graph[1].url, 'https://tierlist.club/')

// --- the 404 page isn't indexed ---
assert.ok(notFoundHeadTags().includes('<meta name="robots" content="noindex" />'))

// --- prerendered body: heading, bundled options, and links to the other lists ---
const body = prerenderedBody(pages[0], pages)
assert.ok(body.includes('data-prerendered'))
assert.ok(body.includes('<h1 class="text-3xl font-semibold">Agent Tier List Maker</h1>'))
assert.ok(body.includes('<li>Pi &amp; Co</li>'))
assert.ok(body.includes('href="/models"'))
assert.ok(!body.includes('href="/"', body.indexOf('More tier lists')), 'no link to itself')
const modelsBody = prerenderedBody(pages[1], pages)
assert.ok(!modelsBody.includes('What you can rank'), 'loaded options are not listed')
assert.ok(modelsBody.includes('Agent Tier List Maker'))

// --- sitemap and llms.txt ---
assert.equal(
  sitemapXml(pages),
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url><loc>https://tierlist.club/</loc></url>',
    '  <url><loc>https://tierlist.club/models</loc></url>',
    '</urlset>',
    '',
  ].join('\n'),
)
const llms = llmsTxt(pages)
assert.ok(llms.startsWith('# tierlist.club\n\n> '))
assert.ok(llms.includes('- [Model Tier List Maker](https://tierlist.club/models): Rank models.'))
assert.ok(llms.includes('You can rank: Amp, Pi & Co.'))
assert.ok(llms.includes('`agents` or `models`'))
assert.ok(llms.includes('## AI agents\n\nIn browsers with WebMCP'))

console.log('seo tests passed')
