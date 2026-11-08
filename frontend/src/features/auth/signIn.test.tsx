import { Auth0Context, type Auth0ContextInterface } from '@auth0/auth0-react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { DEV_SESSION_KEY } from './appStorage.ts'
import { Auth0Bridge } from './Auth0AuthProvider.tsx'
import AuthMenu from './AuthMenu.tsx'
import AuthProvider from './AuthProvider.tsx'
import DevAuthProvider from './DevAuthProvider.tsx'
import SignInPage from './SignInPage.tsx'

function Where() {
  const location = useLocation()
  return <p data-testid="where">{location.pathname + location.search}</p>
}

function renderDev(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DevAuthProvider>
        <AuthMenu />
        <Routes>
          <Route path="/signin" element={<SignInPage />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </DevAuthProvider>
    </MemoryRouter>,
  )
}

describe('sign-in page', () => {
  it('shows the welcome card and what an account adds', () => {
    renderDev('/signin')
    expect(screen.getByRole('heading', { level: 1, name: 'Welcome to worth the cRedIT' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Continue with email' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Create an account' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Keep browsing without an account →' }).getAttribute('href')).toBe('/courses')
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    for (const perk of ['Get AI matches', 'Review your classes', 'Browsing stays free']) expect(screen.getByText(perk)).toBeTruthy()
    expect(screen.queryByText('Save a shortlist')).toBeNull()
    expect(screen.getByText(/Dev sign-in is on/)).toBeTruthy()
  })

  it('signs in and returns to the page in ?next=', async () => {
    renderDev('/signin?next=%2Freview%3Fcourse%3Dabc')
    await userEvent.click(screen.getByRole('button', { name: 'Continue with email' }))
    expect((await screen.findByTestId('where')).textContent).toBe('/review?course=abc')
  })

  it('goes home when ?next= points off the site', async () => {
    renderDev('/signin?next=https%3A%2F%2Fevil.example')
    await userEvent.click(screen.getByRole('button', { name: 'Create an account' }))
    expect((await screen.findByTestId('where')).textContent).toBe('/')
  })

  it('sends a student who is already signed in straight on', async () => {
    localStorage.setItem(DEV_SESSION_KEY, JSON.stringify({ name: 'student', verified: true }))
    renderDev('/signin?next=%2Frecommendations')
    expect((await screen.findByTestId('where')).textContent).toBe('/recommendations')
  })

  it('opens Auth0 login or signup, coming back to ?next=', async () => {
    const auth0 = {
      isLoading: false,
      isAuthenticated: false,
      user: undefined,
      error: undefined,
      loginWithRedirect: vi.fn(async () => undefined),
      logout: vi.fn(async () => undefined),
      getAccessTokenSilently: vi.fn(async () => 'token'),
      getIdTokenClaims: vi.fn(async () => undefined),
    } as unknown as Auth0ContextInterface
    render(
      <MemoryRouter initialEntries={['/signin?next=%2Frecommendations']}>
        <Auth0Context.Provider value={auth0}>
          <Auth0Bridge>
            <SignInPage />
          </Auth0Bridge>
        </Auth0Context.Provider>
      </MemoryRouter>,
    )
    expect(screen.getByText(/Secure sign-in through Auth0/)).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Continue with email' }))
    await userEvent.click(screen.getByRole('button', { name: 'Create an account' }))
    expect(auth0.loginWithRedirect).toHaveBeenNthCalledWith(1, { appState: { returnTo: '/recommendations' } })
    expect(auth0.loginWithRedirect).toHaveBeenNthCalledWith(2, {
      appState: { returnTo: '/recommendations' },
      authorizationParams: { screen_hint: 'signup' },
    })
  })

  it('says so when no sign-in is configured', () => {
    render(
      <MemoryRouter initialEntries={['/signin']}>
        <AuthProvider>
          <SignInPage />
        </AuthProvider>
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: "Sign-in isn't set up yet" })).toBeTruthy()
  })
})

describe('header sign-in controls', () => {
  it('links to the sign-in page, remembering where the student was', () => {
    renderDev('/courses/abc?tab=reviews')
    expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/signin?next=%2Fcourses%2Fabc%3Ftab%3Dreviews')
  })

  it('leaves ?next= off from the home page', () => {
    renderDev('/')
    expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/signin')
  })

  it('marks the pill as the current page on /signin', () => {
    renderDev('/signin?next=%2Freview')
    const pill = screen.getByRole('link', { name: 'Sign in' })
    expect(pill.getAttribute('aria-current')).toBe('page')
    expect(pill.getAttribute('href')).toBe('/signin?next=%2Freview')
  })

  it('shows the initials avatar, "Signed in" and Log out once signed in', async () => {
    localStorage.setItem(DEV_SESSION_KEY, JSON.stringify({ name: 'student', verified: true }))
    renderDev('/')
    // Visible "Signed in"; screen readers also hear who.
    expect(screen.getByText('Signed in', { exact: false }).textContent).toBe('Signed in as student@example.com')
    expect(screen.getByText('S').getAttribute('aria-hidden')).toBe('true')
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))
    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeTruthy()
  })

  it('takes the avatar initials from the first two parts of a real name', () => {
    const auth0 = {
      isLoading: false,
      isAuthenticated: true,
      user: { sub: 'auth0|gp', name: 'Grace Ann Park', email: 'gp@example.com', email_verified: true },
      error: undefined,
      loginWithRedirect: vi.fn(async () => undefined),
      logout: vi.fn(async () => undefined),
      getAccessTokenSilently: vi.fn(async () => 'token'),
      getIdTokenClaims: vi.fn(async () => undefined),
    } as unknown as Auth0ContextInterface
    render(
      <MemoryRouter initialEntries={['/']}>
        <Auth0Context.Provider value={auth0}>
          <Auth0Bridge>
            <AuthMenu />
          </Auth0Bridge>
        </Auth0Context.Provider>
      </MemoryRouter>,
    )
    expect(screen.getByText('GA').getAttribute('aria-hidden')).toBe('true')
    expect(screen.getByRole('button', { name: 'Log out' })).toBeTruthy()
  })
})
