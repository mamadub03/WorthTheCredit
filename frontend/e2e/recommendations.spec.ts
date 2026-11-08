import type { Page } from '@playwright/test'
import { paths } from '../src/routes/paths.ts'
import { expect, signIn, test } from './fixtures.ts'

// Recommendation requests and the way back from a course page (#29 to #32).

const RECOMMEND = /^\/recommendations$/

function conversation(page: Page) {
  return page.getByRole('log', { name: 'Conversation' })
}

/** The student's own message in the chat; screen readers hear it as "You said: …". */
function studentTurn(page: Page, text: string) {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return conversation(page).getByRole('listitem').filter({ hasText: new RegExp(`^You said: ${escaped}$`) })
}

/** Types a message to the advisor and waits for its matches. */
async function ask(page: Page, text: string) {
  const composer = page.getByRole('textbox', { name: 'Message the course advisor' })
  await composer.fill(text)
  await composer.press('Enter')
  await expect(page.getByRole('button', { name: 'Something lighter' })).toBeVisible()
}

test('matches courses from About you @phone', async ({ page, backend }) => {
  await signIn(page, paths.recommendations)
  await page.getByRole('textbox', { name: 'Major' }).fill('Software Engineering')
  const interests = page.getByRole('textbox', { name: 'Interests' })
  await interests.fill('machine learning')
  await interests.press('Enter')
  await page.getByRole('textbox', { name: 'Career goal' }).fill('ML engineer')
  await page.getByRole('button', { name: 'Match me with courses' }).click()

  const log = conversation(page)
  await expect(log.getByText("I'm a Software Engineering major. I'm into machine learning. Career goal: ML engineer.")).toBeVisible()
  const cards = log.getByRole('article')
  await expect(cards.first()).toBeVisible()
  await expect(cards.first().getByRole('link', { name: 'View course' })).toHaveAttribute('href', /^\/courses\/[0-9a-f-]{36}$/)

  const [request] = backend.callsTo('POST', RECOMMEND)
  expect(request.authorization).toBe('Bearer dev:student')
  expect(request.body).toEqual({
    major: 'Software Engineering',
    interests: ['machine learning'],
    skills: [],
    career_goals: 'ML engineer',
    academic_goals: null,
  })
})

test('follow-ups and typed questions send new requests', async ({ page, backend }) => {
  await signIn(page, paths.recommendations)
  await ask(page, 'machine learning')

  await page.getByRole('button', { name: 'Something lighter' }).click()
  await expect(studentTurn(page, 'Something lighter')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Something lighter' })).toBeVisible()

  await ask(page, 'I want hands-on projects')
  await expect(studentTurn(page, 'I want hands-on projects')).toBeVisible()
  const bodies = backend.callsTo('POST', RECOMMEND).map((call) => call.body)
  expect(bodies).toHaveLength(3)
  // The contract has no free-text field yet, so typed requests ride in academic_goals.
  expect(bodies[0]).toMatchObject({ academic_goals: "Student's request: machine learning" })
  expect(bodies[1]).toMatchObject({ academic_goals: "Student's request: Something lighter" })
  expect(bodies[2]).toMatchObject({ academic_goals: "Student's request: I want hands-on projects" })
})

test('a failed match shows in the chat and can be retried', async ({ page, backend }) => {
  backend.respondOnce('POST', RECOMMEND, 502, { detail: 'recommendation_failed' })
  await signIn(page, paths.recommendations)
  const composer = page.getByRole('textbox', { name: 'Message the course advisor' })
  await composer.fill('machine learning')
  await composer.press('Enter')

  const failure = page.getByRole('alert').filter({ hasText: "couldn't reach Gemini" })
  await expect(failure).toBeVisible()
  await failure.getByRole('button', { name: 'Try again' }).click()
  await expect(conversation(page).getByRole('article').first()).toBeVisible()
  expect(backend.callsTo('POST', RECOMMEND)).toHaveLength(2)
})

test('a match opens its course page, and Back shows the same answers without asking again @phone', async ({ page, backend }) => {
  await signIn(page, paths.recommendations)
  await ask(page, 'machine learning')
  const first = conversation(page).getByRole('article').first()
  const title = (await first.getByRole('heading').textContent())?.trim() ?? ''
  const href = (await first.getByRole('link', { name: 'View course' }).getAttribute('href')) ?? ''
  expect(title).not.toBe('')

  await first.getByRole('link', { name: 'View course' }).click()
  await expect(page).toHaveURL(href)
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()

  await page.goBack()
  await expect(page).toHaveURL(paths.recommendations)
  await expect(conversation(page).getByRole('article').first().getByRole('heading')).toHaveText(title)
  expect(backend.callsTo('POST', RECOMMEND)).toHaveLength(1)
})
