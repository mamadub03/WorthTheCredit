import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import Button from '../../components/form/Button.tsx'
import { paths } from '../../routes/paths.ts'
import AuthStatusPanel from './AuthStatusPanel.tsx'
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
      <AuthStatusPanel
        title="Sign-in didn't finish"
        actions={<Button onClick={() => void auth.login({ returnTo: paths.home })}>Try again</Button>}
      >
        <p>{auth.error.message}</p>
      </AuthStatusPanel>
    )
  }
  return <AuthStatusPanel title="Signing you in" live />
}
