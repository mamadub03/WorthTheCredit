/**
 * The one sign-in interface every page uses, whether Auth0 or dev sign-in is
 * behind it. Owner: FE2 (#26). See docs/frontend-coordination.md section 8.
 */
import { createContext, useContext } from 'react'

export interface AuthUser {
  /** Auth0 user id such as "auth0|abc123", or "dev|student" with dev sign-in. */
  sub: string
  email: string | null
  emailVerified: boolean
  name: string | null
}

export type AuthMode = 'auth0' | 'dev' | 'unconfigured'

export interface SignInOptions {
  /** Where to land after signing in. Defaults to the current page. */
  returnTo?: string
}

export interface AuthValue {
  mode: AuthMode
  isLoading: boolean
  isAuthenticated: boolean
  user: AuthUser | null
  /** The last sign-in error (a cancelled Auth0 login, say), or why sign-in isn't configured. */
  error: Error | null
  /** True from logout() until the next sign-in, so protected pages don't sign the student straight back in. */
  justLoggedOut: boolean
  login(options?: SignInOptions): Promise<void>
  signup(options?: SignInOptions): Promise<void>
  logout(): Promise<void>
  /** A token for API calls, or null when signed out or the session can't be renewed. */
  getAccessToken(): Promise<string | null>
  /** Re-reads the student's claims, for after they click the link in the verification email. */
  refreshUser(): Promise<AuthUser | null>
  /** Dev sign-in only: become another test student (handy for seeding demo reviews, one per student per course). */
  devSignInAs?: (name: string) => void
}

export const AuthContext = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth() needs <AuthProvider> above it (see App.tsx)')
  return value
}
