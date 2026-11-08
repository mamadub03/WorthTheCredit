import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { createApiClient, type FetchLike } from '../../api/client.ts'
import { createMockApi } from '../../api/mock/mockApi.ts'
import DevAuthProvider from '../auth/DevAuthProvider.tsx'
import { ApiClientOverride } from '../auth/useApiClient.ts'
import { addTag, emptyProfile, toRecommendationRequest, validateProfile } from './profileFormModel.ts'
import RecommendationsPage from './RecommendationsPage.tsx'
import { profileKey } from './useProfileForm.ts'

const BASE = 'http://localhost:8000'

function renderPage() {
  const mock = createMockApi({ baseUrl: BASE, latencyMs: 0, recommendationLatencyMs: 0, storage: null })
  const sent: unknown[] = []
  const fetch: FetchLike = (input, init) => {
    if (init.method === 'POST') sent.push(JSON.parse(String(init.body)))
    return mock.fetch(input, init)
  }
  const client = createApiClient({ baseUrl: BASE, fetch, getAccessToken: async () => 'dev:erin' })
  render(
    <MemoryRouter initialEntries={['/recommendations']}>
      <DevAuthProvider>
        <ApiClientOverride.Provider value={client}>
          <Routes>
            <Route path="/recommendations" element={<RecommendationsPage />} />
          </Routes>
        </ApiClientOverride.Provider>
      </DevAuthProvider>
    </MemoryRouter>,
  )
  return { sent }
}

describe('profile form model', () => {
  it('needs at least one preference, like the API', () => {
    expect(validateProfile(emptyProfile()).form).toMatch(/at least one thing/)
    expect(validateProfile({ ...emptyProfile(), skills: ['Python'] })).toEqual({})
  })

  it("builds exactly BE2's RecommendationRequest keys", () => {
    expect(
      toRecommendationRequest({
        major: ' Software Engineering ',
        interests: ['machine learning'],
        skills: [],
        careerGoals: 'ML engineer',
        academicGoals: '  ',
      }),
    ).toEqual({ major: 'Software Engineering', interests: ['machine learning'], skills: [], career_goals: 'ML engineer', academic_goals: null })
  })

  it('cleans and limits tags', () => {
    expect(addTag([], '  game   design ')).toEqual({ tags: ['game design'], error: null })
    expect(addTag(['Python'], 'python').error).toMatch(/already/)
  })
})

describe('recommendations page', () => {
  it('asks for at least one preference before calling the API', async () => {
    const user = userEvent.setup()
    const { sent } = renderPage()
    await user.click(await screen.findByRole('button', { name: 'Get recommendations' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/at least one thing/)
    expect(sent).toEqual([])
  })

  it('sends the profile and lists matches that link to course pages', async () => {
    const user = userEvent.setup()
    const { sent } = renderPage()
    await user.type(await screen.findByRole('textbox', { name: 'Major' }), 'Software Engineering')
    await user.type(screen.getByRole('textbox', { name: 'Interests' }), 'machine learning{Enter}')
    await user.type(screen.getByRole('textbox', { name: 'Career goals' }), 'ML engineer')
    await user.click(screen.getByRole('button', { name: 'Get recommendations' }))

    expect(await screen.findByRole('heading', { name: 'Your matches' })).toBeTruthy()
    expect(sent).toEqual([
      { major: 'Software Engineering', interests: ['machine learning'], skills: [], career_goals: 'ML engineer', academic_goals: null },
    ])
    const first = screen.getAllByRole('link')[0]
    expect(first.textContent).toMatch(/^CSCI-/)
    expect(first.getAttribute('href')).toMatch(/^\/courses\/c0a5e000-/)
  })

  it("remembers the student's answers in this browser", async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(await screen.findByRole('textbox', { name: 'Major' }), 'Biology')
    expect(JSON.parse(localStorage.getItem(profileKey('dev|student')) ?? '{}')).toMatchObject({ major: 'Biology' })
  })
})
