import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  appType: 'spa',
  oxc: {},
  plugins: [tailwindcss()],
  build: {
    assetsInlineLimit: 10240,
    minify: true,
    cssMinify: 'lightningcss',
  },
})
