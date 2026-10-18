import { defineConfig } from '@playwright/test'

// Runs the web app against the emulators; started by `npm run test:e2e`.
export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  // the specs share one set of emulators; running them in parallel slows processing enough to time out
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5174',
    channel: 'chrome',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'npm --prefix ../../web run dev -- --host 127.0.0.1 --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174',
    env: { VITE_USE_EMULATORS: 'true' },
    reuseExistingServer: false,
    timeout: 60_000
  }
})
