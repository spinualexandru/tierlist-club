import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  oxc: {},
  plugins: [tailwindcss()],
  build: {
    assetsInlineLimit: 10240,
  },
})
