import { useMemo, type ReactNode } from 'react'
import { env } from '../../config/env.ts'
import Auth0AuthProvider from './Auth0AuthProvider.tsx'
import { AuthContext, type AuthValue } from './authContext.ts'
import DevAuthProvider from './DevAuthProvider.tsx'

/**
 * Picks how students sign in: Auth0 once all three VITE_AUTH0_* values are set;
 * otherwise dev sign-in under `vite dev` with VITE_DEV_AUTH=true; otherwise
 * nobody can sign in, and protected pages say what's missing.
 * It must sit inside <BrowserRouter>. Owner: FE2 (#26).
 */
export default function AuthProvider({ children }: { children: ReactNode }) {
  if (env.auth0) return <Auth0AuthProvider config={env.auth0}>{children}</Auth0AuthProvider>
  if (env.devAuth) return <DevAuthProvider startUnverified={env.devAuthStartsUnverified}>{children}</DevAuthProvider>
  return <SignInNotConfigured>{children}</SignInNotConfigured>
}

const NOT_CONFIGURED = new Error(
  'Set VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID, and VITE_AUTH0_AUDIENCE in frontend/.env.local, or use VITE_DEV_AUTH=true with npm run dev.',
)

function SignInNotConfigured({ children }: { children: ReactNode }) {
  const value = useMemo<AuthValue>(
    () => ({
      mode: 'unconfigured',
      isLoading: false,
      isAuthenticated: false,
      user: null,
      error: NOT_CONFIGURED,
      justLoggedOut: false,
      login: async () => undefined,
      signup: async () => undefined,
      logout: async () => undefined,
      getAccessToken: async () => null,
      refreshUser: async () => null,
    }),
    [],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
