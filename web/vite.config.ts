/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version)
  },
  build: {
    // the Firebase SDK alone is ~740 kB minified (~185 kB gzipped)
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // large, rarely changing libraries get their own cacheable chunks
        manualChunks (id) {
          // the run explainer's SDKs load only when it's used (services/assistant.ts)
          if (/node_modules\/(@firebase\/(ai|app-check)|firebase\/(ai|app-check))\//.test(id)) return 'firebase-ai'
          if (/node_modules\/(@firebase|firebase|re2js)\//.test(id)) return 'firebase'
          if (/node_modules\/(@mantine|@floating-ui|@tabler)\//.test(id)) return 'mantine'
          if (/node_modules\/(react|react-dom|react-router|scheduler|@tanstack)\//.test(id)) return 'react'
        }
      }
    }
  },
  test: {
    // functions/csv.js builds timestamps in local time; pin it so snapshots are stable
    env: { TZ: 'UTC' },
    setupFiles: ['./src/test/setup.ts']
  }
})
