import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  oxc: {},
  plugins: [tailwindcss()],
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
