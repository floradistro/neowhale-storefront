import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:4173',
    browserName: 'chromium',
  },
  webServer: {
    command: 'npx serve e2e/fixtures --listen 4173 --no-clipboard',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
})
