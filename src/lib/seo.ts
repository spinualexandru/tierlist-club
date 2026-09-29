// What search engines, link previews, and LLMs get from each page. The app itself
// renders client-side, so the build (the `seo` plugin in vite.config.ts) writes
// these into a static HTML file per list, along with sitemap.xml and llms.txt.

import { escapeHtml } from './render.ts'
import type { TierList } from './tierlist.ts'

export const SITE_URL = 'https://tierlist.club'
export const SITE_NAME = 'tierlist.club'
const SITE_DESCRIPTION =
  'Free tier list maker for AI: rank AI coding agents and AI models from S to F, then share a link or save a PNG.'

/** 1200×630, for link previews. */
const SOCIAL_IMAGE = {
  path: '/og.png',
  width: 1200,
  height: 630,
  alt: 'tierlist.club: tier list maker for AI coding agents and models',
}

/** A tier list and the path it's served at canonically, `/` for the default list. */
export interface Page {
  list: TierList
  path: string
}

export const pageTitle = (list: TierList): string => `${list.title} · ${SITE_NAME}`

export const absoluteUrl = (path: string): string => new URL(path, SITE_URL).href

/** JSON for a `<script>` element: `<` is escaped, so the data can't close the script. */
const jsonLd = (data: unknown): string =>
  html`<script type="application/ld+json">
    ${JSON.stringify(data).replace(/</g, '\\u003c')}
  </script>`

/**
 * `<head>` tags for a list's page: title, description, canonical URL, Open
 * Graph and Twitter previews, and schema.org data describing the site and app.
 */
export const headTags = ({ list, path }: Page): string => {
  const title = escapeHtml(pageTitle(list))
  const description = escapeHtml(list.description)
  const url = absoluteUrl(path)
  const image = absoluteUrl(SOCIAL_IMAGE.path)
  return html`
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="${SOCIAL_IMAGE.width}" />
    <meta property="og:image:height" content="${SOCIAL_IMAGE.height}" />
    <meta property="og:image:alt" content="${SOCIAL_IMAGE.alt}" />
    <meta name="twitter:card" content="summary_large_image" />
    ${jsonLd({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': `${SITE_URL}/#website`,
          url: absoluteUrl('/'),
          name: SITE_NAME,
          description: SITE_DESCRIPTION,
          inLanguage: 'en',
        },
        {
          '@type': 'WebApplication',
          '@id': `${url}#app`,
          url,
          name: list.title,
          description: list.description,
          abstract: list.about,
          isPartOf: { '@id': `${SITE_URL}/#website` },
          applicationCategory: 'EntertainmentApplication',
          operatingSystem: 'Any',
          browserRequirements: 'Requires JavaScript',
          isAccessibleForFree: true,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          image,
        },
      ],
    })}
  `
}

/** `<head>` tags for the 404 page, which search engines shouldn't index. */
export const notFoundHeadTags = (): string => html`
  <title>Page not found · ${SITE_NAME}</title>
  <meta name="robots" content="noindex" />
`

/** The names of the options a list ranks, when they're bundled rather than loaded. */
const optionNames = (list: TierList): string[] | undefined =>
  Array.isArray(list.options) ? list.options.map((option) => option.name) : undefined

const HOW_IT_WORKS = [
  'Press the + in a tier to open the picker, then pick options one by one, search for one, or add them all.',
  'Drag each option into its tier, from S at the top to F at the bottom. Add in-between tiers like A+ and A− from a tier’s flag, and drop an option on the trash to take it off.',
  'Share a link that opens your tier list for anyone, or save it as a square PNG.',
]

/**
 * The page's content as static HTML, inside `#app`, for crawlers and LLMs that
 * don't run JavaScript (and visitors without it). An inline script in
 * index.html hides it once JavaScript runs, and the app replaces it.
 */
export const prerenderedBody = ({ list }: Page, pages: Page[]): string => {
  const names = optionNames(list)
  const others = pages.filter((page) => page.list !== list)
  return html`
    <div data-prerendered class="mx-auto max-w-2xl px-6 py-8 leading-relaxed text-foreground">
      <header class="mb-8">
        <a href="/" class="inline-flex items-center gap-2 no-underline text-foreground">
          <img src="/logo.svg" alt="" width="48" height="48" />
          <span class="wordmark text-2xl">tierlist<span class="text-tier-s">club</span></span>
        </a>
      </header>
      <main class="flex flex-col gap-4">
        <h1 class="text-3xl font-semibold">${escapeHtml(list.title)}</h1>
        <p>${escapeHtml(list.description)}</p>
        <p>${escapeHtml(list.about)}</p>
        <noscript><p class="text-muted">Turn on JavaScript to drag and drop.</p></noscript>
        <h2 class="mt-4 text-xl font-semibold">How it works</h2>
        <ol class="list-decimal pl-6">
          ${HOW_IT_WORKS.map((step) => html`<li>${escapeHtml(step)}</li>`).join('')}
        </ol>
        ${
          names
            ? html`
                <h2 class="mt-4 text-xl font-semibold">What you can rank</h2>
                <ul class="flex flex-wrap gap-x-4 gap-y-1">
                  ${names.map((name) => html`<li>${escapeHtml(name)}</li>`).join('')}
                </ul>
              `
            : ''
        }
        ${
          others.length
            ? html`
                <h2 class="mt-4 text-xl font-semibold">More tier lists</h2>
                <ul class="flex flex-col gap-2">
                  ${others
                    .map(
                      ({ list: other, path }) =>
                        html`<li>
                          <a href="${path}" class="font-medium text-foreground"
                            >${escapeHtml(other.title)}</a
                          >: ${escapeHtml(other.description)}
                        </li>`,
                    )
                    .join('')}
                </ul>
              `
            : ''
        }
      </main>
    </div>
  `
}

/** sitemap.xml listing each list's canonical URL. */
export const sitemapXml = (pages: Page[]): string =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...pages.map(({ path }) => `  <url><loc>${escapeHtml(absoluteUrl(path))}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n')

/** llms.txt (https://llmstxt.org): what the site is and does, in Markdown, for LLMs. */
export const llmsTxt = (pages: Page[]): string =>
  [
    `# ${SITE_NAME}`,
    '',
    `> ${SITE_DESCRIPTION}`,
    '',
    'tierlist.club runs entirely in the browser, with no sign-up or account. Each tier list starts empty with tiers S, A, B, C, D, and F; options are picked from a drawer and dragged into tiers, and in-between tiers like A+ or A− can be added. A finished list can be shared as a link that recreates it or saved as a square PNG image.',
    '',
    '## Tier lists',
    '',
    ...pages.map(
      ({ list, path }) => `- [${list.title}](${absoluteUrl(path)}): ${list.description}`,
    ),
    ...pages.flatMap(({ list }) => {
      const names = optionNames(list)
      return [
        '',
        `## ${list.title}`,
        '',
        list.about,
        ...(names ? ['', `You can rank: ${names.join(', ')}.`] : []),
      ]
    }),
    '',
    '## AI agents',
    '',
    'In browsers with WebMCP, each page gives AI agents tools to search the options, rank them into tiers, get a share link, and save the PNG, so an agent can make a tier list without dragging and dropping.',
    '',
    '## Share links',
    '',
    `A shared tier list opens from a link like \`${SITE_URL}/?type=<list id>&selections=<data>\`, where the list id is ${pages.map(({ list }) => `\`${list.id}\``).join(' or ')} and the selections are compact base64url-encoded binary, not readable text. Opening the link fills the list in and moves to the list's own URL.`,
    '',
  ].join('\n')
