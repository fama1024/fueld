import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// Jedes Release bekommt automatisch eine Version aus Build-Datum und Commit, z.B.
// "2026.11.01 · 0c72418". Vercel setzt VERCEL_GIT_COMMIT_SHA beim Build.
const buildDate = new Date()
  .toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' })
  .replaceAll('-', '.')
const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'lokal'

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(`${buildDate} · ${commit}`),
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
