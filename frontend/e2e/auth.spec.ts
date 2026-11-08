import { MOCK_COURSES } from '../src/api/mock/fixtures.ts'
import { paths } from '../src/routes/paths.ts'
import { expect, startSignedIn, test } from './fixtures.ts'

// Signup and sign-in (#26, #32), with dev sign-in standing in for Auth0. The
// Auth0 redirect itself needs a tenant; unit tests cover it with a faked SDK.

const swen = MOCK_COURSES.find((course) => course.code === 'SWEN-261')!

test('a visitor creates an account from the header and can log out @phone', async ({ page }) => {
  await page.goto(paths.home)
  await page.getByRole('banner').getByRole('link', { name: 'Sign in' }).click()

  await expect(page).toHaveURL(paths.signIn())
  await expect(page.getByRole('heading', { level: 1, name: 'Welcome to WorthTheCredit' })).toBeVisible()
  await page.getByRole('button', { name: 'Create an account' }).click()

  await expect(page).toHaveURL(paths.home)
  const header = page.getByRole('banner')
  await expect(header).toContainText('student@example.com')
  await header.getByRole('button', { name: 'Log out' }).click()
  await expect(header.getByRole('link', { name: 'Sign in' })).toBeVisible()
  await expect(header).not.toContainText('student@example.com')
})

test('signing in returns students to the page they were on', async ({ page }) => {
  await page.goto(paths.course(swen.id))
  await page.getByRole('banner').getByRole('link', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(paths.signIn(paths.course(swen.id)))

  await page.getByRole('button', { name: 'Continue with email' }).click()
  await expect(page).toHaveURL(paths.course(swen.id))
  await expect(page.getByRole('banner').getByRole('button', { name: 'Log out' })).toBeVisible()
})

test("a sign-in link can't send students to another site", async ({ page }) => {
  await page.goto(`/signin?next=${encodeURIComponent('https://evil.example/login')}`)
  await page.getByRole('button', { name: 'Continue with email' }).click()
  await expect(page).toHaveURL(paths.home)
})

test('a protected page signs the student in and keeps its URL', async ({ page }) => {
  // With Auth0 this is a round trip through the login page; dev sign-in does it in place.
  await page.goto(paths.writeReview(swen.id))
  await expect(page.getByRole('heading', { level: 1, name: 'Was it worth the credit?' })).toBeVisible()
  await expect(page).toHaveURL(paths.writeReview(swen.id))
  await expect(page.getByText(swen.title)).toBeVisible()
})

test('a student has to verify their email before reviewing', async ({ page }) => {
  await startSignedIn(page, { name: 'student', verified: false })
  await page.goto(paths.writeReview())

  await expect(page.getByRole('heading', { name: 'Verify your email' })).toBeVisible()
  await expect(page.getByText('new@example.com', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Was it worth the credit?' })).toHaveCount(0)

  await page.getByRole('button', { name: "I've verified my email" }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Was it worth the credit?' })).toBeVisible()
})
