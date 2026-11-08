import type { Page } from '@playwright/test'
import { MOCK_COURSES } from '../src/api/mock/fixtures.ts'
import { DIFFICULTY_QUESTION, GOALS_QUESTION, WEEKLY_HOURS_QUESTION, WORTH_SCORE_QUESTION } from '../src/domain/reviewVocabulary.ts'
import { paths } from '../src/routes/paths.ts'
import { expect, signIn, test } from './fixtures.ts'

// Review submission (#27, #28, #32): the form, the exact ReviewCreate JSON,
// and what students see for each answer the backend can give.

const swen = MOCK_COURSES.find((course) => course.code === 'SWEN-261')!
const REVIEWS = /^\/courses\/[^/]+\/reviews$/

/** Answers every required question: Career preparation, Worth Score 4, two skills, difficulty 3, 6-10 hours. */
async function answerRequired(page: Page) {
  await page.getByRole('group', { name: GOALS_QUESTION }).getByRole('checkbox', { name: 'Career preparation' }).check()
  await page.getByRole('group', { name: WORTH_SCORE_QUESTION }).getByRole('radio', { name: /^4/ }).check()
  const skills = page.getByRole('textbox', { name: 'Skills or knowledge you gained' })
  for (const skill of ['Python', 'Code review']) {
    await skills.fill(skill)
    await skills.press('Enter')
  }
  await page.getByRole('group', { name: DIFFICULTY_QUESTION }).getByRole('radio', { name: /^3/ }).check()
  await page.getByRole('group', { name: WEEKLY_HOURS_QUESTION }).getByRole('radio', { name: /^6-10/ }).check()
}

function worthScore(page: Page, score: number) {
  return page.getByRole('group', { name: WORTH_SCORE_QUESTION }).getByRole('radio', { name: new RegExp(`^${score}`) })
}

test('checks the answers before sending anything', async ({ page, backend }) => {
  await signIn(page, paths.writeReview())
  await page.getByRole('button', { name: 'Post review' }).click()

  await expect(page.getByText('Pick the course you took.')).toBeVisible()
  await expect(page.getByText('Pick at least one goal.')).toBeVisible()
  await expect(page.getByText('Add at least one skill or topic you gained.')).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Course' })).toBeFocused()
  expect(backend.callsTo('POST', REVIEWS)).toHaveLength(0)
})

test("posts a review as BE2's ReviewCreate JSON @phone", async ({ page, backend }) => {
  await signIn(page, paths.writeReview())
  await page.getByRole('combobox', { name: 'Course' }).fill('swen')
  await page.getByRole('option', { name: /SWEN-261/ }).click()
  await expect(page.getByText(swen.title)).toBeVisible()

  await answerRequired(page)
  await page.getByRole('textbox', { name: /^What should future students know\?/ }).fill('Start the team project early.')
  const year = String(new Date().getFullYear())
  await page.getByRole('combobox', { name: /^Term taken/ }).selectOption('Fall')
  await page.getByRole('combobox', { name: /^Year/ }).selectOption(year)
  await page.getByRole('button', { name: 'Post review' }).click()

  await expect(page.getByRole('heading', { name: 'Review posted' })).toBeVisible()
  const [post] = backend.callsTo('POST', REVIEWS)
  expect(post.path).toBe(`/courses/${swen.id}/reviews`)
  expect(post.authorization).toBe('Bearer dev:student')
  expect(post.body).toEqual({
    goals: ['career_preparation'],
    worth_score: 4,
    concept_difficulty: 3,
    weekly_hours_range: '6-10',
    skills_gained: ['Python', 'Code review'],
    feedback: 'Start the team project early.',
    instructor_name: null,
    semester: `Fall ${year}`,
  })
  await expect(page.getByRole('link', { name: 'See the course' })).toHaveAttribute('href', paths.course(swen.id))
})

test('a course link opens the form with that course picked', async ({ page }) => {
  await signIn(page, paths.writeReview(swen.id))
  await expect(page.getByText(swen.title)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Change' })).toBeVisible()
})

test("the backend's one-review-per-course answer gets its own screen", async ({ page, backend }) => {
  // The sentence the backend sends (backend/app/api/routes/reviews.py); the app goes by the 409.
  backend.respondOnce('POST', REVIEWS, 409, { detail: 'You already submitted a review for this course' })
  await signIn(page, paths.writeReview(swen.id))
  await answerRequired(page)
  await page.getByRole('button', { name: 'Post review' }).click()

  await expect(page.getByRole('heading', { name: "You've already reviewed this course" })).toBeVisible()
  await page.getByRole('button', { name: 'Review a different course' }).click()
  await expect(page.getByRole('combobox', { name: 'Course' })).toBeVisible()
})

test('an expired sign-in keeps the answers, and posting again works', async ({ page, backend }) => {
  backend.respondOnce('POST', REVIEWS, 401, { detail: 'Invalid or expired access token' })
  await signIn(page, paths.writeReview(swen.id))
  await answerRequired(page)
  await page.getByRole('button', { name: 'Post review' }).click()

  const problem = page.getByRole('alert').filter({ hasText: 'Your sign-in expired' })
  await expect(problem).toBeVisible()
  await expect(problem.getByRole('button', { name: 'Sign in again' })).toBeVisible()
  await expect(worthScore(page, 4)).toBeChecked()

  await page.getByRole('button', { name: 'Post review' }).click()
  await expect(page.getByRole('heading', { name: 'Review posted' })).toBeVisible()
  expect(backend.callsTo('POST', REVIEWS)).toHaveLength(2)
})

test("the backend's field errors land on the right question", async ({ page, backend }) => {
  backend.respondOnce('POST', REVIEWS, 422, {
    detail: [{ type: 'value_error', loc: ['body', 'skills_gained'], msg: 'Each skill can appear only once' }],
  })
  await signIn(page, paths.writeReview(swen.id))
  await answerRequired(page)
  await page.getByRole('button', { name: 'Post review' }).click()

  await expect(page.getByText('Each skill can appear only once')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Skills or knowledge you gained' })).toBeFocused()
})

test('unfinished answers survive a reload', async ({ page }) => {
  await signIn(page, paths.writeReview(swen.id))
  await answerRequired(page)
  await page.reload()

  await expect(page.getByText(swen.title)).toBeVisible()
  await expect(worthScore(page, 4)).toBeChecked()
  await expect(page.getByRole('button', { name: 'Remove Python' })).toBeVisible()
})
