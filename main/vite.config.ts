import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url))

// The main website (<domain>). Firebase settings come from .env.local at the repo root,
// which the Saathi and admin websites share.
// https://vite.dev/config/
export default defineConfig({
  root: here('.'),
  envDir: here('..'),
  plugins: [react(), tailwindcss()],
  build: { outDir: here('dist'), emptyOutDir: true },
})
