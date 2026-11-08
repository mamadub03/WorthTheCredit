/**
 * State and actions for the verify-email screen. Owner: FE2 (#26).
 *
 * Auth0 sends the verification email at sign-up. There's no resend endpoint
 * in the API contract on main, so this hook only re-checks the student's
 * claims after they click the link.
 */
import { useCallback, useState } from 'react'
import { useAuth } from './authContext.ts'

export type VerificationCheck = 'idle' | 'checking' | 'still_unverified' | 'failed'

export interface EmailVerification {
  /** The address the verification email went to. */
  email: string | null
  /** Re-reads the student's claims. Once the email is verified, the page behind the notice opens by itself. */
  check(): Promise<void>
  checkStatus: VerificationCheck
}

export function useEmailVerification(): EmailVerification {
  const auth = useAuth()
  const [checkStatus, setCheckStatus] = useState<VerificationCheck>('idle')

  const check = useCallback(async () => {
    setCheckStatus('checking')
    try {
      const user = await auth.refreshUser()
      setCheckStatus(user?.emailVerified ? 'idle' : 'still_unverified')
    } catch {
      setCheckStatus('failed')
    }
  }, [auth])

  return { email: auth.user?.email ?? null, check, checkStatus }
}
