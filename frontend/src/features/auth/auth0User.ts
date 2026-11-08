/**
 * Small Auth0 helpers, kept out of the provider file so it only exports components.
 * Owner: FE2 (#26).
 */
import type { User } from '@auth0/auth0-react'
import type { AuthUser } from './authContext.ts'

// Auth0 error codes that mean "the student has to sign in again", not "something broke".
const SIGN_IN_AGAIN = new Set(['login_required', 'consent_required', 'interaction_required', 'missing_refresh_token', 'invalid_grant'])

export function needsSignIn(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    SIGN_IN_AGAIN.has(String((error as { error: unknown }).error))
  )
}

export function toAuthUser(user: User | undefined | null): AuthUser | null {
  if (!user?.sub) return null
  return {
    sub: user.sub,
    email: user.email ?? null,
    emailVerified: user.email_verified === true,
    name: user.name ?? null,
  }
}
