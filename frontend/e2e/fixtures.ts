import { test as base, expect, type Page } from '@playwright/test'
import { DEV_SESSION_KEY } from '../src/features/auth/appStorage.ts'
import { paths } from '../src/routes/paths.ts'
import { installFakeBackend, type FakeBackend } from './fakeBackend.ts'

interface Fixtures {
  /** The fake API this test's page talks to. Every test gets one. */
  backend: FakeBackend
  /** Fails the test on app errors in the browser console. */
  consoleGuard: void
}

/**
 * Playwright's `test` with FE2's fixtures: a fake backend per test, Google
 * Fonts answered locally (runs work offline), and no console errors allowed.
 * Owner: FE2 (#32).
 */
export const test = base.extend<Fixtures>({
  consoleGuard: [
    async ({ page }, use) => {
      const problems: string[] = []
      await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) =>
        route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
      )
      page.on('pageerror', (error) => problems.push(`Uncaught: ${error.message}`))
      page.on('console', (message) => {
        if (message.type() !== 'error') return
        const text = message.text()
        // Chrome logs every 4xx and 5xx response, and some tests cause those on purpose.
        if (/^Failed to load resource: the server responded with a status of \d{3}/.test(text)) return
        problems.push(text)
      })
      await use()
      expect(problems, 'errors in the browser console').toEqual([])
    },
    { auto: true },
  ],
  backend: [
    async ({ page, baseURL }, use) => {
      if (!baseURL) throw new Error('playwright.config.ts must set use.baseURL')
      await use(await installFakeBackend(page, baseURL))
    },
    { auto: true },
  ],
})

export { expect }

/** Signs in through the sign-in page, the way a student does, and lands on `next`. */
export async function signIn(page: Page, next: string = paths.home): Promise<void> {
  await page.goto(paths.signIn(next))
  await page.getByRole('button', { name: 'Continue with email' }).click()
  await expect(page).toHaveURL(next)
}

/**
 * Starts the dev sign-in in a given state before the app loads, for states
 * the UI can't produce on its own, such as an unverified email. Later changes
 * the app makes (verifying, logging out) are kept across reloads.
 */
export async function startSignedIn(page: Page, session: { name: string; verified: boolean }): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      if (window.localStorage.getItem(key) === null) window.localStorage.setItem(key, value)
    },
    [DEV_SESSION_KEY, JSON.stringify(session)] as const,
  )
}
