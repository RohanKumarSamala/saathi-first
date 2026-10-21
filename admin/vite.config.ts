import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url))

// The admin website (admin.<domain>). It shares the repo's packages, Firebase settings
// (.env.local at the repo root) and brand files with the main site (main/).
export default defineConfig({
  root: here('.'),
  envDir: here('..'),
  publicDir: here('../main/public'),
  plugins: [react(), tailwindcss()],
  server: { port: 5175 },
  build: { outDir: here('dist'), emptyOutDir: true },
})
