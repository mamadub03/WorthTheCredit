import { useEffect, useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import Button from '../../components/form/Button.tsx'
import StatusPanel from '../../components/form/StatusPanel.tsx'
import { useAuth } from './authContext.ts'
import VerifyEmailNotice from './VerifyEmailNotice.tsx'

/**
 * Guards a page that needs a signed-in student, and optionally a verified email
 * (reviews do; recommendations don't). Signed-out students go to sign-in and
 * come back to the same URL. Owner: FE2 (#26).
 */
export default function RequireAuth({ requireVerifiedEmail = false, children }: { requireVerifiedEmail?: boolean; children: ReactNode }) {
  const auth = useAuth()
  const location = useLocation()
  const returnTo = location.pathname + location.search
  const started = useRef(false)
  const mustSignIn = auth.mode !== 'unconfigured' && !auth.isLoading && !auth.isAuthenticated && !auth.justLoggedOut

  useEffect(() => {
    if (!mustSignIn || started.current) return
    started.current = true
    void auth.login({ returnTo })
  }, [mustSignIn, auth, returnTo])

  if (auth.mode === 'unconfigured') {
    return <StatusPanel title="Sign-in isn't set up yet">{auth.error ? <p>{auth.error.message}</p> : null}</StatusPanel>
  }
  if (auth.isLoading) return <StatusPanel title="Checking your sign-in" live />
  if (!auth.isAuthenticated) {
    const signIn = <Button onClick={() => void auth.login({ returnTo })}>{auth.justLoggedOut ? 'Sign in again' : 'Sign in'}</Button>
    return auth.justLoggedOut ? (
      <StatusPanel title="You're signed out" actions={signIn} />
    ) : (
      <StatusPanel title="Taking you to sign in" live actions={signIn} />
    )
  }
  if (requireVerifiedEmail && !auth.user?.emailVerified) return <VerifyEmailNotice />
  return <>{children}</>
}
