import { Auth0Context, type Auth0ContextInterface } from '@auth0/auth0-react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, type ReactNode } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { DEV_SESSION_KEY, userKey, writeStored } from './appStorage.ts'
import { Auth0Bridge } from './Auth0AuthProvider.tsx'
import { useAuth, type AuthValue } from './authContext.ts'
import AuthProvider from './AuthProvider.tsx'
import DevAuthProvider from './DevAuthProvider.tsx'
import RequireAuth from './RequireAuth.tsx'

function Where() {
  const location = useLocation()
  return <p data-testid="where">{location.pathname}</p>
}

function renderDev(path: string, element: ReactNode, startUnverified = false) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DevAuthProvider startUnverified={startUnverified}>
        <Routes>
          <Route path="/" element={<Where />} />
          <Route path="/private" element={element} />
        </Routes>
      </DevAuthProvider>
    </MemoryRouter>,
  )
}

let latest: AuthValue | null = null
function Capture() {
  const value = useAuth()
  useEffect(() => {
    latest = value
  })
  return null
}

describe('dev sign-in', () => {
  it('signs a student in when a protected page opens', async () => {
    renderDev('/private', <RequireAuth><p>secret</p></RequireAuth>)
    expect(await screen.findByText('secret')).toBeTruthy()
  })

  it("sends BE2's dev tokens", async () => {
    renderDev('/private', <RequireAuth><Capture /></RequireAuth>)
    await waitFor(() => expect(latest?.isAuthenticated).toBe(true))
    expect(await latest?.getAccessToken()).toBe('dev:student')
    expect(latest?.user).toEqual({ sub: 'dev|student', email: 'student@example.com', emailVerified: true, name: 'student' })

    act(() => latest?.devSignInAs?.('Alice!'))
    expect(await latest?.getAccessToken()).toBe('dev:alice')
  })

  it('holds an unverified student at the verify notice until they verify', async () => {
    renderDev('/private', <RequireAuth requireVerifiedEmail><p>review form</p></RequireAuth>, true)
    expect(await screen.findByRole('heading', { name: 'Verify your email' })).toBeTruthy()
    expect(screen.queryByText('review form')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: "I've verified my email" }))
    expect(await screen.findByText('review form')).toBeTruthy()
  })

  it("logs out, clears the student's data, and keeps the mock's sample data", async () => {
    localStorage.setItem(DEV_SESSION_KEY, JSON.stringify({ name: 'student', verified: true }))
    writeStored(userKey('dev|student', 'review-draft:SWEN-261'), { worthScore: 4 })
    localStorage.setItem('wtc:mock-api:v1', '{}')
    render(
      <MemoryRouter initialEntries={['/private']}>
        <DevAuthProvider>
          <Capture />
          <Routes>
            <Route path="/" element={<Where />} />
            <Route path="/private" element={<RequireAuth><p>secret</p></RequireAuth>} />
          </Routes>
        </DevAuthProvider>
      </MemoryRouter>,
    )
    await waitFor(() => expect(latest?.isAuthenticated).toBe(true))

    await act(async () => latest?.logout())

    // Landed home without being signed straight back in.
    expect(screen.getByTestId('where').textContent).toBe('/')
    expect(latest?.isAuthenticated).toBe(false)
    expect(latest?.justLoggedOut).toBe(true)
    expect(sessionStorage.getItem(userKey('dev|student', 'review-draft:SWEN-261'))).toBeNull()
    expect(localStorage.getItem(DEV_SESSION_KEY)).toBeNull()
    expect(localStorage.getItem('wtc:mock-api:v1')).toBe('{}')
  })
})

describe('without any sign-in configured', () => {
  it('protected pages say what is missing', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <RequireAuth>
            <p>secret</p>
          </RequireAuth>
        </AuthProvider>
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: "Sign-in isn't set up yet" })).toBeTruthy()
    expect(screen.getByText(/VITE_AUTH0_DOMAIN/)).toBeTruthy()
  })
})

describe('Auth0 bridge', () => {
  function fakeAuth0(overrides: Partial<Auth0ContextInterface> = {}) {
    return {
      isLoading: false,
      isAuthenticated: true,
      user: { sub: 'auth0|1', email: 'tiger@rit.edu', email_verified: false, name: 'Tiger' },
      error: undefined,
      loginWithRedirect: vi.fn(async () => undefined),
      logout: vi.fn(async () => undefined),
      getAccessTokenSilently: vi.fn(async () => 'real-token'),
      getIdTokenClaims: vi.fn(async () => ({ __raw: 'x', sub: 'auth0|1', email: 'tiger@rit.edu', email_verified: true })),
      ...overrides,
    } as unknown as Auth0ContextInterface
  }

  function renderBridge(value: Auth0ContextInterface, path = '/courses/SWEN-261/review?from=card') {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Auth0Context.Provider value={value}>
          <Auth0Bridge>
            <Capture />
          </Auth0Bridge>
        </Auth0Context.Provider>
      </MemoryRouter>,
    )
  }

  it('maps the Auth0 user', () => {
    renderBridge(fakeAuth0())
    expect(latest?.mode).toBe('auth0')
    expect(latest?.user).toEqual({ sub: 'auth0|1', email: 'tiger@rit.edu', emailVerified: false, name: 'Tiger' })
  })

  it('returns students to the page they were on, and opens the signup screen for sign up', async () => {
    const value = fakeAuth0({ isAuthenticated: false })
    renderBridge(value)
    await latest?.login()
    await latest?.signup()
    expect(value.loginWithRedirect).toHaveBeenNthCalledWith(1, { appState: { returnTo: '/courses/SWEN-261/review?from=card' } })
    expect(value.loginWithRedirect).toHaveBeenNthCalledWith(2, {
      appState: { returnTo: '/courses/SWEN-261/review?from=card' },
      authorizationParams: { screen_hint: 'signup' },
    })
  })

  it('treats "sign in again" errors as signed out', async () => {
    renderBridge(fakeAuth0({ getAccessTokenSilently: vi.fn(async () => Promise.reject({ error: 'login_required' })) as never }))
    expect(await latest?.getAccessToken()).toBeNull()
  })

  it('re-reads email_verified with a fresh token', async () => {
    const value = fakeAuth0()
    renderBridge(value)
    expect((await latest?.refreshUser())?.emailVerified).toBe(true)
    expect(value.getAccessTokenSilently).toHaveBeenCalledWith({ cacheMode: 'off' })
  })
})
