import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { createApiClient, type FetchLike } from '../../api/client.ts'
import { MOCK_COURSES } from '../../api/mock/fixtures.ts'
import { createMockApi } from '../../api/mock/mockApi.ts'
import { DIFFICULTY_QUESTION, WEEKLY_HOURS_QUESTION, WORTH_SCORE_QUESTION } from '../../domain/reviewVocabulary.ts'
import DevAuthProvider from '../auth/DevAuthProvider.tsx'
import { ApiClientOverride } from '../auth/useApiClient.ts'
import WriteReviewPage from './WriteReviewPage.tsx'

const BASE = 'http://localhost:8000'
const swen = MOCK_COURSES.find((course) => course.code === 'SWEN-261')!

function renderPage(path = '/review') {
  const mock = createMockApi({ baseUrl: BASE, latencyMs: 0, storage: null })
  const sent: { url: string; body: unknown }[] = []
  const fetch: FetchLike = (input, init) => {
    if (init.method === 'POST') sent.push({ url: input, body: JSON.parse(String(init.body)) })
    return mock.fetch(input, init)
  }
  const client = createApiClient({ baseUrl: BASE, fetch, getAccessToken: async () => 'dev:alice' })
  render(
    <MemoryRouter initialEntries={[path]}>
      <DevAuthProvider>
        <ApiClientOverride.Provider value={client}>
          <Routes>
            <Route path="/review" element={<WriteReviewPage />} />
            <Route path="/courses/:courseId" element={<p>course page</p>} />
          </Routes>
        </ApiClientOverride.Provider>
      </DevAuthProvider>
    </MemoryRouter>,
  )
  return { sent }
}

describe('review form', () => {
  it('shows every missing answer and focuses the first one', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('heading', { name: 'Was it worth the credit?' })

    await user.click(screen.getByRole('button', { name: 'Post review' }))

    expect(screen.getByText('Pick the course you took.')).toBeTruthy()
    expect(screen.getByText('Pick at least one goal.')).toBeTruthy()
    expect(screen.getByText('Add at least one skill or topic you gained.')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Course' }))
  })

  it("picks a course, fills the form, and sends BE2's ReviewCreate JSON", async () => {
    const user = userEvent.setup()
    const { sent } = renderPage()
    await screen.findByRole('heading', { name: 'Was it worth the credit?' })

    await user.type(screen.getByRole('combobox', { name: 'Course' }), 'swen')
    await user.click(await screen.findByRole('option', { name: /SWEN-261/ }))
    expect(screen.getByText('Introduction to Software Engineering')).toBeTruthy()

    await user.click(screen.getByRole('checkbox', { name: 'Career preparation' }))
    await user.click(within(screen.getByRole('group', { name: WORTH_SCORE_QUESTION })).getByRole('radio', { name: /4\s*Mostly/ }))
    await user.type(screen.getByRole('textbox', { name: 'Skills or knowledge you gained' }), 'Agile{Enter}code  review{Enter}')
    await user.click(within(screen.getByRole('group', { name: DIFFICULTY_QUESTION })).getByRole('radio', { name: /3\s*Moderate/ }))
    await user.click(within(screen.getByRole('group', { name: WEEKLY_HOURS_QUESTION })).getByRole('radio', { name: /6-10/ }))
    await user.type(screen.getByRole('textbox', { name: /What should future students know/ }), 'Start the project early.')
    await user.selectOptions(screen.getByRole('combobox', { name: /Term taken/ }), 'Fall')
    await user.selectOptions(screen.getByRole('combobox', { name: /Year/ }), String(new Date().getFullYear() - 1))

    await user.click(screen.getByRole('button', { name: 'Post review' }))

    expect(await screen.findByRole('heading', { name: 'Review posted' })).toBeTruthy()
    expect(screen.getByText(/^Posted anonymously to SWEN-261\./)).toBeTruthy()
    expect(screen.getByText('Worth 4 / 5')).toBeTruthy()
    expect(screen.getByText('Difficulty 3 / 5')).toBeTruthy()
    expect(screen.getByText('6-10 h/wk')).toBeTruthy()
    expect(sent).toEqual([
      {
        url: `${BASE}/courses/${swen.id}/reviews`,
        body: {
          goals: ['career_preparation'],
          worth_score: 4,
          concept_difficulty: 3,
          weekly_hours_range: '6-10',
          skills_gained: ['Agile', 'code review'],
          feedback: 'Start the project early.',
          instructor_name: null,
          semester: `Fall ${new Date().getFullYear() - 1}`,
        },
      },
    ])
  })

  it('opens with the course from the link already picked', async () => {
    renderPage(`/review?course=${swen.id}`)
    expect(await screen.findByText('Introduction to Software Engineering')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Change' })).toBeTruthy()
    // The header, breadcrumb and rules card name the course once it is known.
    expect(screen.getByText('Reviewing SWEN-261 · Introduction to Software Engineering')).toBeTruthy()
    expect(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByRole('link', { name: 'SWEN-261' }).getAttribute('href')).toBe(
      `/courses/${swen.id}`,
    )
    expect(screen.getByText('You can review SWEN-261 once.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Cancel' }).getAttribute('href')).toBe(`/courses/${swen.id}`)
  })

  it('counts the five required answers and says what is still missing', async () => {
    const user = userEvent.setup()
    renderPage(`/review?course=${swen.id}`)
    await screen.findByText('Introduction to Software Engineering')
    const [progress] = screen.getAllByRole('progressbar', { name: 'Required questions answered' })
    expect(progress.getAttribute('aria-valuenow')).toBe('0')
    expect(screen.getByText('Still need your goals, a Worth Score, a difficulty, weekly hours, one skill.')).toBeTruthy()

    await user.click(screen.getByRole('checkbox', { name: 'Career preparation' }))
    await user.click(within(screen.getByRole('group', { name: WORTH_SCORE_QUESTION })).getByRole('radio', { name: /^5/ }))
    await user.click(within(screen.getByRole('group', { name: DIFFICULTY_QUESTION })).getByRole('radio', { name: /^2/ }))
    expect(progress.getAttribute('aria-valuenow')).toBe('3')
    expect(screen.getByText('Still need weekly hours, one skill.')).toBeTruthy()

    await user.click(within(screen.getByRole('group', { name: WEEKLY_HOURS_QUESTION })).getByRole('radio', { name: /^3-6/ }))
    await user.type(screen.getByRole('textbox', { name: 'Skills or knowledge you gained' }), 'Git{Enter}')
    expect(progress.getAttribute('aria-valuenow')).toBe('5')
    expect(screen.getByText("Ready to post. You can't edit it afterward.")).toBeTruthy()
  })

  it('removes a skill with its button', async () => {
    const user = userEvent.setup()
    renderPage()
    const skills = await screen.findByRole('textbox', { name: 'Skills or knowledge you gained' })
    await user.type(skills, 'Agile{Enter}Git{Enter}')
    await user.click(screen.getByRole('button', { name: 'Remove Agile' }))
    expect(screen.queryByRole('button', { name: 'Remove Agile' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Remove Git' })).toBeTruthy()
    vi.restoreAllMocks()
  })
})
