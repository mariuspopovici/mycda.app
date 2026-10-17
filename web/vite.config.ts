/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // functions/csv.js builds timestamps in local time; pin it so snapshots are stable
    env: { TZ: 'UTC' }
  }
})
