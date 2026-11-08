import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { createApiClient, type FetchLike } from '../../api/client.ts'
import { ApiError, errorFromResponse } from '../../api/errors.ts'
import { createMockApi } from '../../api/mock/mockApi.ts'
import { AuthContext, useAuth, type AuthValue } from '../auth/authContext.ts'
import DevAuthProvider from '../auth/DevAuthProvider.tsx'
import { ApiClientOverride } from '../auth/useApiClient.ts'
import { failureMessage, profileSentence, requestFor } from './chatModel.ts'
import { addTag, emptyProfile, toRecommendationRequest, validateProfile } from './profileFormModel.ts'
import RecommendationsPage from './RecommendationsPage.tsx'
import { profileKey } from './useProfileForm.ts'

const BASE = 'http://localhost:8000'

// require_verified_email's 403 detail on main.
const UNVERIFIED_DETAIL =
  'Email verification required. Confirm your email in Auth0, and ensure the access token includes an email_verified claim (coordinate with Frontend 2 / Auth0 Actions).'
const VERIFY_EMAIL = 'Verify your email to get matches. Open the link we sent you, then try again.'
const TOKEN_BEFORE_VERIFYING = 'cached-before-verifying'

function WithRefreshUser({ refreshUser, children }: { refreshUser: AuthValue['refreshUser']; children: ReactNode }) {
  const auth = useAuth()
  return <AuthContext.Provider value={{ ...auth, refreshUser }}>{children}</AuthContext.Provider>
}

/**
 * `unverified` starts the student on the token Auth0 cached before they
 * verified, which the API refuses. Like Auth0, it stays the token until a
 * refresh succeeds; `refresh` decides how that round trip goes.
 */
function renderPage({ failFirst = false, unverified = false, refresh = async () => {} } = {}) {
  const mock = createMockApi({ baseUrl: BASE, latencyMs: 0, recommendationLatencyMs: 0, storage: null })
  const sent: Record<string, unknown>[] = []
  let failed = false
  let token = unverified ? TOKEN_BEFORE_VERIFYING : 'dev:erin'
  const refreshUser = vi.fn(async () => {
    await refresh()
    token = 'dev:erin'
    return null
  })
  const fetch: FetchLike = async (input, init) => {
    if (init.method === 'POST') {
      sent.push(JSON.parse(String(init.body)))
      if (failFirst && !failed) {
        failed = true
        return new Response(JSON.stringify({ detail: 'recommendation_failed' }), { status: 502 })
      }
      if (new Headers(init.headers).get('Authorization') === `Bearer ${TOKEN_BEFORE_VERIFYING}`) {
        return new Response(JSON.stringify({ detail: UNVERIFIED_DETAIL }), { status: 403 })
      }
    }
    return mock.fetch(input, init)
  }
  const client = createApiClient({ baseUrl: BASE, fetch, getAccessToken: async () => token })
  const view = render(
    <MemoryRouter initialEntries={['/recommendations']}>
      <DevAuthProvider>
        <WithRefreshUser refreshUser={refreshUser}>
          <ApiClientOverride.Provider value={client}>
            <Routes>
              <Route path="/recommendations" element={<RecommendationsPage />} />
            </Routes>
          </ApiClientOverride.Provider>
        </WithRefreshUser>
      </DevAuthProvider>
    </MemoryRouter>,
  )
  return { sent, view, refreshUser }
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

  it("asks an unverified student to verify instead of showing the API's sentence", () => {
    const fromApi = errorFromResponse(403, { detail: UNVERIFIED_DETAIL })
    expect(fromApi.message).toBe(UNVERIFIED_DETAIL)
    expect(failureMessage(fromApi)).toBe(VERIFY_EMAIL)
    expect(failureMessage(new ApiError(403, 'some_other_refusal'))).toBe(VERIFY_EMAIL)
    expect(failureMessage(new ApiError(400, 'forbidden'))).toBe(VERIFY_EMAIL)
    expect(failureMessage(new ApiError(400, 'email_not_verified'))).toBe(VERIFY_EMAIL)
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
    const { sent, refreshUser } = renderPage({ failFirst: true })
    await user.type(await screen.findByRole('textbox', { name: 'Message the course advisor' }), 'machine learning{Enter}')
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(/couldn't reach Gemini/)
    await user.click(within(alert).getByRole('button', { name: 'Try again' }))
    expect(await screen.findAllByRole('article')).toBeTruthy()
    expect(sent).toHaveLength(2)
    expect(refreshUser).not.toHaveBeenCalled()
  })

  describe('when the API refuses an unverified email', () => {
    async function askAndGetRefused(user: ReturnType<typeof userEvent.setup>) {
      await user.type(await screen.findByRole('textbox', { name: 'Message the course advisor' }), 'machine learning{Enter}')
      return screen.findByRole('alert')
    }

    it("shows a plain message, and Try again works once they've verified", async () => {
      const user = userEvent.setup()
      const { sent, refreshUser } = renderPage({ unverified: true })
      const alert = await askAndGetRefused(user)
      expect(alert.textContent).toContain(VERIFY_EMAIL)
      expect(alert.textContent).not.toMatch(/Auth0/)

      await user.click(within(alert).getByRole('button', { name: 'Try again' }))

      expect(await screen.findAllByRole('article')).toBeTruthy()
      expect(sent).toHaveLength(2)
      expect(refreshUser).toHaveBeenCalledOnce()
    })

    it('still tries the request if the token refresh fails', async () => {
      const user = userEvent.setup()
      const { sent } = renderPage({ unverified: true, refresh: () => Promise.reject(new Error('Auth0 is down')) })
      await user.click(within(await askAndGetRefused(user)).getByRole('button', { name: 'Try again' }))

      await vi.waitFor(() => expect(sent).toHaveLength(2))
      expect((await screen.findByRole('alert')).textContent).toContain(VERIFY_EMAIL)
    })

    it('sends nothing if the student presses Stop during the token refresh', async () => {
      const user = userEvent.setup()
      let finishRefresh = () => {}
      const { sent, refreshUser } = renderPage({
        unverified: true,
        refresh: () => new Promise<void>((resolve) => (finishRefresh = resolve)),
      })
      await user.click(within(await askAndGetRefused(user)).getByRole('button', { name: 'Try again' }))
      await user.click(await screen.findByRole('button', { name: 'Stop' }))
      expect(refreshUser).toHaveBeenCalledOnce()

      await act(async () => finishRefresh())

      expect((await screen.findByRole('alert')).textContent).toContain('Stopped.')
      expect(sent).toHaveLength(1)
    })
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
