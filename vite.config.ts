import tailwindcss from '@tailwindcss/vite'
import { defineConfig, runnerImport, type Plugin } from 'vite'
import type * as Seo from './src/lib/seo'
import type * as TierLists from './src/tierlists'

interface SeoModules {
  seo: typeof Seo
  lists: typeof TierLists
}

/**
 * Fills index.html's `<!--seo:head-->` and `<!--seo:body-->` for each tier list
 * (see src/lib/seo.ts), since crawlers and LLMs mostly don't run the app. The
 * build writes `index.html` for the default list and `<list id>.html` for every
 * list (served at `/<list id>`), a `404.html`, `sitemap.xml`, and `llms.txt`.
 * The dev server fills in the page for the requested path.
 */
const seo = (): Plugin => {
  const fill = ({ seo, lists }: SeoModules, template: string, path: string): string => {
    const pages = lists.tierLists.map((list) => ({ list, path: lists.tierListPath(list) }))
    // The default list is served at `/` and at `/<list id>`, with `/` as its canonical URL.
    const page = pages.find((page) => page.path === path || `/${page.list.id}` === path)
    return template
      .replace('<!--seo:head-->', page ? seo.headTags(page) : seo.notFoundHeadTags())
      .replace('<!--seo:body-->', page ? seo.prerenderedBody(page, pages) : '')
  }

  return {
    name: 'seo',
    // After Vite's own HTML plugin, which adds index.html to the bundle.
    enforce: 'post',
    async transformIndexHtml(template, { server, originalUrl }) {
      if (!server) return template
      const [seo, lists] = await Promise.all([
        server.ssrLoadModule('/src/lib/seo.ts'),
        server.ssrLoadModule('/src/tierlists/index.ts'),
      ])
      const { pathname } = new URL(originalUrl ?? '/', 'http://localhost')
      const path = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
      return fill({ seo, lists } as SeoModules, template, path)
    },
    async generateBundle(_, bundle) {
      const index = bundle['index.html']
      if (index?.type !== 'asset') return
      const template = String(index.source)
      // Loaded through Vite, since the lists import their logos.
      const load = <T>(id: string) =>
        runnerImport<T>(id, { configFile: false, logLevel: 'warn' }).then(({ module }) => module)
      const [seo, lists] = await Promise.all([
        load<typeof Seo>('/src/lib/seo.ts'),
        load<typeof TierLists>('/src/tierlists/index.ts'),
      ])
      const pages = lists.tierLists.map((list) => ({ list, path: lists.tierListPath(list) }))

      index.source = fill({ seo, lists }, template, '/')
      const files: Record<string, string> = {
        '404.html': fill({ seo, lists }, template, '/404'),
        'sitemap.xml': seo.sitemapXml(pages),
        'llms.txt': seo.llmsTxt(pages),
      }
      for (const { list } of pages)
        files[`${list.id}.html`] = fill({ seo, lists }, template, `/${list.id}`)
      for (const [fileName, source] of Object.entries(files))
        this.emitFile({ type: 'asset', fileName, source })
    },
  }
}

export default defineConfig({
  oxc: {},
  plugins: [tailwindcss(), seo()],
  build: {
    // Fonts stay separate files: each weight and script subset loads only once the page uses it.
    assetsInlineLimit: (file, content) => !/\.woff2?$/.test(file) && content.length < 10240,
    rolldownOptions: {
      output: {
        // Dependencies change far less often than the app, so they get their own
        // long-cached chunk that survives app-only deploys. html-to-image stays in
        // its own lazy chunk, loaded only on export.
        codeSplitting: {
          groups: [
            {
              name: 'vendor',
              test: (id) => id.includes('/node_modules/') && !id.includes('/html-to-image/'),
            },
          ],
        },
      },
    },
  },
})
