import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { paths } from '../../routes/paths.ts'
import { clearAppStorage, DEV_SESSION_KEY, readStored, writeStored } from './appStorage.ts'
import { AuthContext, type AuthUser, type AuthValue, type SignInOptions } from './authContext.ts'

interface DevSession {
  name: string
  verified: boolean
}

/**
 * Fake sign-in for local work before the Auth0 tenant exists (VITE_DEV_AUTH=true
 * under `vite dev`; production builds can't turn it on). It sends BE2's dev
 * tokens, "dev:<name>" for a verified student and "dev-unverified" for an
 * unverified one, which BE2's API accepts when it runs with DEV_AUTH_BYPASS=true.
 * Owner: FE2 (#26).
 */
export default function DevAuthProvider({ children, startUnverified = false }: { children: ReactNode; startUnverified?: boolean }) {
  const navigate = useNavigate()
  const location = useLocation()
  const here = location.pathname + location.search
  const [session, setSession] = useState<DevSession | null>(() => readStored<DevSession>(DEV_SESSION_KEY, 'local'))
  const [justLoggedOut, setJustLoggedOut] = useState(false)

  const remember = useCallback((next: DevSession) => {
    writeStored(DEV_SESSION_KEY, next, 'local')
    setSession(next)
    setJustLoggedOut(false)
  }, [])

  const signIn = useCallback(
    async (options?: SignInOptions) => {
      remember({ name: 'student', verified: !startUnverified })
      if (options?.returnTo && options.returnTo !== here) navigate(options.returnTo)
    },
    [remember, startUnverified, here, navigate],
  )

  const devSignInAs = useCallback(
    (name: string) => {
      clearAppStorage()
      remember({ name: name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'student', verified: true })
    },
    [remember],
  )

  const logout = useCallback(async () => {
    clearAppStorage()
    setJustLoggedOut(true)
    setSession(null)
    navigate(paths.home)
  }, [navigate])

  const getAccessToken = useCallback(
    async () => (session ? (session.verified ? `dev:${session.name}` : 'dev-unverified') : null),
    [session],
  )

  // In dev, "I've verified my email" always succeeds.
  const refreshUser = useCallback(async () => {
    if (!session) return null
    const next = { ...session, verified: true }
    remember(next)
    return toUser(next)
  }, [session, remember])

  const value = useMemo<AuthValue>(
    () => ({
      mode: 'dev',
      isLoading: false,
      isAuthenticated: session !== null,
      user: session ? toUser(session) : null,
      error: null,
      justLoggedOut,
      login: signIn,
      signup: signIn,
      logout,
      getAccessToken,
      refreshUser,
      devSignInAs,
    }),
    [session, justLoggedOut, signIn, logout, getAccessToken, refreshUser, devSignInAs],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** Mirrors who BE2's dev bypass says each token is. */
function toUser(session: DevSession): AuthUser {
  return session.verified
    ? { sub: `dev|${session.name}`, email: `${session.name}@example.com`, emailVerified: true, name: session.name }
    : { sub: 'dev|unverified', email: 'new@example.com', emailVerified: false, name: session.name }
}
