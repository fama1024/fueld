import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'fs'
import path from 'path'

// Quelle der Versionsnummer ist package.json, jedes Release erhöht sie im selben PR
const { version } = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'))

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
