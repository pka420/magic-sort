import { defineConfig, devices } from '@playwright/test'

// The game is deployed at a domain root, so the preview server serves it from
// its root too: the e2e test proves the deployed shape, not a friendlier one.
const PREVIEW_URL = 'http://localhost:4173/'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: process.env.CI !== undefined,
  retries: process.env.CI !== undefined ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: PREVIEW_URL,
    trace: 'on-first-retry'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // E2E runs against the real production bundle, not the dev server.
  webServer: {
    command: 'npm run build && npm run preview',
    url: PREVIEW_URL,
    reuseExistingServer: process.env.CI === undefined
  }
})
