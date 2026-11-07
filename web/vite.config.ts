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
    // the Firebase SDK alone is ~770 kB minified (~190 kB gzipped)
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // large, rarely changing libraries get their own cacheable chunks
        manualChunks (id) {
          // the run explainer's SDK loads only when it's used (services/assistant.ts). App Check stays in the
          // main firebase chunk: the entry imports it to start it before Auth (services/appCheck.ts, ADR-0018)
          if (/node_modules\/(@firebase\/ai|firebase\/ai)\//.test(id)) return 'firebase-ai'
          // Analytics loads only on the live site, after the visitor accepts (services/analytics.ts)
          if (/node_modules\/(@firebase\/(analytics|installations)|firebase\/analytics)\//.test(id)) return 'firebase-analytics'
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
