import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { createApiClient, type FetchLike } from '../../api/client.ts'
import { ApiError } from '../../api/errors.ts'
import { createMockApi } from '../../api/mock/mockApi.ts'
import DevAuthProvider from '../auth/DevAuthProvider.tsx'
import { ApiClientOverride } from '../auth/useApiClient.ts'
import { failureMessage, profileSentence, requestFor } from './chatModel.ts'
import { addTag, emptyProfile, toRecommendationRequest, validateProfile } from './profileFormModel.ts'
import RecommendationsPage from './RecommendationsPage.tsx'
import { profileKey } from './useProfileForm.ts'

const BASE = 'http://localhost:8000'

function renderPage({ failFirst = false } = {}) {
  const mock = createMockApi({ baseUrl: BASE, latencyMs: 0, recommendationLatencyMs: 0, storage: null })
  const sent: Record<string, unknown>[] = []
  let failed = false
  const fetch: FetchLike = async (input, init) => {
    if (init.method === 'POST') {
      sent.push(JSON.parse(String(init.body)))
      if (failFirst && !failed) {
        failed = true
        return new Response(JSON.stringify({ detail: 'recommendation_failed' }), { status: 502 })
      }
    }
    return mock.fetch(input, init)
  }
  const client = createApiClient({ baseUrl: BASE, fetch, getAccessToken: async () => 'dev:erin' })
  const view = render(
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
  return { sent, view }
}

describe('profile form model', () => {
  it('needs at least one preference, like the API', () => {
    expect(validateProfile(emptyProfile()).form).toMatch(/at least one thing/)
    expect(validateProfile({ ...emptyProfile(), skills: ['Python'] })).toEqual({})
  })

  it("builds exactly BE2's RecommendationRequest keys", () => {
    expect(
      toRecommendationRequest({ major: ' Software Engineering ', interests: ['machine learning'], skills: [], careerGoals: 'ML engineer', academicGoals: '  ' }),
    ).toEqual({ major: 'Software Engineering', interests: ['machine learning'], skills: [], career_goals: 'ML engineer', academic_goals: null })
  })

  it('cleans and limits tags', () => {
    expect(addTag([], '  game   design ')).toEqual({ tags: ['game design'], error: null })
    expect(addTag(['Python'], 'python').error).toMatch(/already/)
  })
})

describe('chat model', () => {
  const profile = { major: 'Applied Arts', interests: ['AI', 'games'], skills: ['Java'], careerGoals: 'ML engineer.', academicGoals: '' }

  it('summarizes the profile in the first person', () => {
    expect(profileSentence(profile)).toBe("I'm an Applied Arts major. I know Java. I'm into AI and games. Career goal: ML engineer.")
  })

  it('carries typed requests in academic_goals until the contract has a field for them', () => {
    expect(requestFor({ ...profile, academicGoals: 'One free elective' }, 'Something lighter').academic_goals).toBe(
      "One free elective\nStudent's request: Something lighter",
    )
    expect(requestFor(emptyProfile(), null).academic_goals).toBeNull()
  })

  it('explains failures in plain words', () => {
    expect(failureMessage(new ApiError(502, 'recommendation_failed'))).toMatch(/couldn't reach Gemini/)
    expect(failureMessage(new ApiError(429, 'rate_limited'))).toMatch(/minute/)
    expect(failureMessage(new ApiError(0, 'network_error'))).toMatch(/connection/)
  })
})

describe('AI match page', () => {
  it('asks for at least one preference before calling the API', async () => {
    const user = userEvent.setup()
    const { sent } = renderPage()
    await user.click(await screen.findByRole('button', { name: 'Match me with courses' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/at least one thing/)
    expect(sent).toEqual([])
  })

  it('matches from About you, then takes a follow-up', async () => {
    const user = userEvent.setup()
    const { sent } = renderPage()
    await user.type(await screen.findByRole('textbox', { name: 'Major' }), 'Software Engineering')
    await user.type(screen.getByRole('textbox', { name: 'Interests' }), 'machine learning{Enter}')
    await user.type(screen.getByRole('textbox', { name: 'Career goal' }), 'ML engineer')
    await user.click(screen.getByRole('button', { name: 'Match me with courses' }))

    const log = screen.getByRole('log', { name: 'Conversation' })
    expect(await within(log).findByText("I'm a Software Engineering major. I'm into machine learning. Career goal: ML engineer.")).toBeTruthy()
    expect((await within(log).findAllByRole('article')).length).toBeGreaterThan(0)
    expect(sent[0]).toEqual({ major: 'Software Engineering', interests: ['machine learning'], skills: [], career_goals: 'ML engineer', academic_goals: null })

    await user.click(screen.getByRole('button', { name: 'Something lighter' }))
    expect(await within(log).findByText('Something lighter')).toBeTruthy()
    expect(sent[1]).toMatchObject({ academic_goals: "Student's request: Something lighter" })
  })

  it('answers a typed question even before About you is filled in', async () => {
    const user = userEvent.setup()
    const { sent } = renderPage()
    await user.type(await screen.findByRole('textbox', { name: 'Message the course advisor' }), 'I want to learn game design{Enter}')
    expect(await screen.findAllByRole('article')).toBeTruthy()
    expect(sent[0]).toMatchObject({ major: null, academic_goals: "Student's request: I want to learn game design" })
  })

  it('shows a failure in the chat and retries it', async () => {
    const user = userEvent.setup()
    const { sent } = renderPage({ failFirst: true })
    await user.type(await screen.findByRole('textbox', { name: 'Message the course advisor' }), 'machine learning{Enter}')
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(/couldn't reach Gemini/)
    await user.click(within(alert).getByRole('button', { name: 'Try again' }))
    expect(await screen.findAllByRole('article')).toBeTruthy()
    expect(sent).toHaveLength(2)
  })

  it('keeps the conversation when the student comes back', async () => {
    const user = userEvent.setup()
    const first = renderPage()
    await user.type(await screen.findByRole('textbox', { name: 'Message the course advisor' }), 'machine learning{Enter}')
    await screen.findAllByRole('article')
    first.view.unmount()

    const second = renderPage()
    expect(await screen.findByText('machine learning')).toBeTruthy()
    expect((await screen.findAllByRole('article')).length).toBeGreaterThan(0)
    expect(second.sent).toEqual([])
  })

  it("remembers the student's answers in this browser", async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(await screen.findByRole('textbox', { name: 'Major' }), 'Biology')
    expect(JSON.parse(localStorage.getItem(profileKey('dev|student')) ?? '{}')).toMatchObject({ major: 'Biology' })
  })
})
