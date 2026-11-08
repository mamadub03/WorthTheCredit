import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { paths } from '../../routes/paths.ts'
import { useAuth } from './authContext.ts'

/**
 * Where Auth0 sends students back (/callback). The Auth0 SDK reads the code
 * from the URL and then returns the student to the page they started on.
 * Anything else that lands here goes home. Owner: FE2 (#26).
 */
export default function AuthCallbackPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const nothingToFinish = auth.mode !== 'auth0' || (!auth.isLoading && !auth.error)

  useEffect(() => {
    if (nothingToFinish) navigate(paths.home, { replace: true })
  }, [nothingToFinish, navigate])

  if (auth.mode === 'auth0' && auth.error) {
    return (
      <section className="panel">
        <h1>Sign-in didn't finish</h1>
        <p>{auth.error.message}</p>
        <button type="button" onClick={() => void auth.login({ returnTo: paths.home })}>
          Try again
        </button>
      </section>
    )
  }
  return (
    <section className="panel" aria-live="polite">
      <h1>Signing you in</h1>
    </section>
  )
}
