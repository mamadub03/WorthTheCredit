import { render, screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { createApiClient, type FetchLike } from '../../api/client.ts'
import { MOCK_COURSES } from '../../api/mock/fixtures.ts'
import { createMockApi } from '../../api/mock/mockApi.ts'
import { createReview } from '../../api/reviews.ts'
import { DIFFICULTY_QUESTION, WEEKLY_HOURS_QUESTION, WORTH_SCORE_QUESTION } from '../../domain/reviewVocabulary.ts'
import DevAuthProvider from '../auth/DevAuthProvider.tsx'
import { ApiClientOverride } from '../auth/useApiClient.ts'
import { emptyReview } from './reviewFormModel.ts'
import { draftKey } from './useReviewDraft.ts'
import { toFormErrors } from './useReviewSubmission.ts'
import WriteReviewPage from './WriteReviewPage.tsx'

const BASE = 'http://localhost:8000'
const course = MOCK_COURSES.find((item) => item.code === 'GCIS-124')!

function setup({ token = 'dev:alice' as string | null, fetch }: { token?: string | null; fetch?: FetchLike } = {}) {
  const mock = createMockApi({ baseUrl: BASE, latencyMs: 0, storage: null })
  const client = createApiClient({ baseUrl: BASE, fetch: fetch ?? mock.fetch, getAccessToken: async () => token })
  render(
    <MemoryRouter initialEntries={[`/review?course=${course.id}`]}>
      <DevAuthProvider>
        <ApiClientOverride.Provider value={client}>
          <Routes>
            <Route path="/review" element={<WriteReviewPage />} />
          </Routes>
        </ApiClientOverride.Provider>
      </DevAuthProvider>
    </MemoryRouter>,
  )
  return { mock }
}

async function answerAndPost(user: UserEvent) {
  await screen.findByText(course.title)
  await user.click(screen.getByRole('checkbox', { name: 'Specific skill development' }))
  await user.click(within(screen.getByRole('group', { name: WORTH_SCORE_QUESTION })).getByRole('radio', { name: /5\s*Completely/ }))
  await user.type(screen.getByRole('textbox', { name: 'Skills or knowledge you gained' }), 'Java{Enter}')
  await user.click(within(screen.getByRole('group', { name: DIFFICULTY_QUESTION })).getByRole('radio', { name: /2\s*Easy/ }))
  await user.click(within(screen.getByRole('group', { name: WEEKLY_HOURS_QUESTION })).getByRole('radio', { name: /3-6/ }))
  await user.click(screen.getByRole('button', { name: 'Post review' }))
}

describe('review submission', () => {
  it('posts and offers next steps', async () => {
    const user = userEvent.setup()
    setup()
    await answerAndPost(user)
    expect(await screen.findByRole('heading', { name: 'Review posted' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'See the course' }).getAttribute('href')).toBe(`/courses/${course.id}`)
    expect(sessionStorage.getItem(draftKey('dev|student'))).toBeNull()
  })

  it('says so when the student already reviewed the course', async () => {
    const user = userEvent.setup()
    const { mock } = setup()
    const direct = createApiClient({ baseUrl: BASE, fetch: mock.fetch, getAccessToken: async () => 'dev:alice' })
    await createReview(direct, course.id, {
      goals: ['career_preparation'],
      worth_score: 3,
      concept_difficulty: 3,
      weekly_hours_range: '3-6',
      skills_gained: ['Java'],
      feedback: null,
      instructor_name: null,
      semester: null,
    })
    await answerAndPost(user)
    expect(await screen.findByRole('heading', { name: "You've already reviewed this course" })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Review a different course' }))
    expect(await screen.findByRole('combobox', { name: 'Course' })).toBeTruthy()
  })

  it('keeps the answers and offers to sign in again when the session expired', async () => {
    const user = userEvent.setup()
    setup({ token: null })
    await answerAndPost(user)
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(/sign-in expired/)
    expect(within(alert).getByRole('button', { name: 'Sign in again' })).toBeTruthy()
    const draft = JSON.parse(sessionStorage.getItem(draftKey('dev|student')) ?? 'null')
    expect(draft).toMatchObject({ courseId: course.id, skillsGained: ['Java'], worthScore: 5 })
  })

  it('explains an unverified email', async () => {
    const user = userEvent.setup()
    setup({ token: 'dev-unverified' })
    await answerAndPost(user)
    expect((await screen.findByRole('alert')).textContent).toMatch(/Verify your email/)
  })

  it("puts the server's validation messages on the right questions", async () => {
    const user = userEvent.setup()
    const reject: FetchLike = async (input, init) => {
      if (init.method !== 'POST') return createMockApi({ baseUrl: BASE, latencyMs: 0, storage: null }).fetch(input, init)
      const detail = [{ type: 'value_error', loc: ['body', 'skills_gained'], msg: 'Value error, skills_gained cannot contain blank items' }]
      return new Response(JSON.stringify({ detail }), { status: 422, headers: { 'Content-Type': 'application/json' } })
    }
    setup({ fetch: reject })
    await answerAndPost(user)
    expect(await screen.findByText('skills_gained cannot contain blank items')).toBeTruthy()
    expect((await screen.findByRole('alert')).textContent).toMatch(/Some answers need fixing/)
  })

  it('restores a saved draft for the same course', async () => {
    sessionStorage.setItem(
      draftKey('dev|student'),
      JSON.stringify({ ...emptyReview(course.id), skillsGained: ['Saved skill'], goals: ['personal_exploration'] }),
    )
    localStorage.setItem('wtc:dev-auth', JSON.stringify({ name: 'student', verified: true }))
    setup()
    expect(await screen.findByRole('button', { name: 'Remove Saved skill' })).toBeTruthy()
    expect((screen.getByRole('checkbox', { name: 'Personal exploration' }) as HTMLInputElement).checked).toBe(true)
  })
})

describe('toFormErrors', () => {
  it('maps API field names and keeps the rest for the general message', () => {
    expect(toFormErrors({ worth_score: 'too high', semester: 'bad', _form: 'whole body' })).toEqual({
      fields: { worthScore: 'too high', semesterTerm: 'bad' },
      other: ['whole body'],
    })
  })
})
