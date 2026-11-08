import { defineConfig, devices } from '@playwright/test'
import { FAKE_API_PATH } from './e2e/fakeBackend.ts'

/**
 * End-to-end tests (#32): `npm run e2e`. They start the app under `vite dev`
 * on its own port with dev sign-in, and answer its API calls from
 * e2e/fakeBackend.ts, so no backend, database, Auth0 tenant, or Gemini key is
 * needed. Owner: FE2.
 */
const PORT = 5174
const ORIGIN = `http://localhost:${PORT}`

// The installed Google Chrome, so no browser download is needed. Set
// PW_BUNDLED_CHROMIUM=1 to use Playwright's Chromium (`npx playwright install chromium` once).
const channel = process.env.PW_BUNDLED_CHROMIUM === '1' ? undefined : 'chrome'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: ORIGIN,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel } },
    // The phone layout runs the tests tagged @phone.
    { name: 'phone', use: { ...devices['Pixel 7'], channel }, grep: /@phone/ },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: ORIGIN,
    // Always a fresh server, so the env below applies even if 5173 is running with mocks on.
    reuseExistingServer: false,
    env: {
      VITE_API_BASE_URL: `${ORIGIN}${FAKE_API_PATH}`,
      // The fake backend answers every call, so the in-app mock stays off.
      VITE_API_MOCKS: '',
      VITE_DEV_AUTH: 'true',
      VITE_DEV_AUTH_UNVERIFIED: 'false',
      VITE_AUTH0_DOMAIN: '',
      VITE_AUTH0_CLIENT_ID: '',
      VITE_AUTH0_AUDIENCE: '',
    },
  },
})
