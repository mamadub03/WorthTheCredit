import { useEffect, useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router'
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

  if (auth.mode === 'unconfigured') return <StatusPanel title="Sign-in isn't set up yet" detail={auth.error?.message} />
  if (auth.isLoading) return <StatusPanel title="Checking your sign-in" />
  if (!auth.isAuthenticated && auth.justLoggedOut) {
    return <StatusPanel title="You're signed out" action={{ label: 'Sign in again', onClick: () => void auth.login({ returnTo }) }} />
  }
  if (!auth.isAuthenticated) {
    return <StatusPanel title="Taking you to sign in" action={{ label: 'Sign in', onClick: () => void auth.login({ returnTo }) }} />
  }
  if (requireVerifiedEmail && !auth.user?.emailVerified) return <VerifyEmailNotice />
  return <>{children}</>
}

function StatusPanel({ title, detail, action }: { title: string; detail?: string; action?: { label: string; onClick: () => void } }) {
  return (
    <section className="panel" aria-live="polite">
      <h1>{title}</h1>
      {detail ? <p>{detail}</p> : null}
      {action ? (
        <button type="button" onClick={action.onClick}>
          {action.label}
        </button>
      ) : null}
    </section>
  )
}
