import Button from '../../components/form/Button.tsx'
import { useAuth } from './authContext.ts'
import styles from './AuthMenu.module.css'

/**
 * Sign-in controls at the right end of FE1's header. Owner: FE2 (#26).
 * Shows nothing while sign-in state loads, so "Log in" doesn't flash on reload.
 */
export default function AuthMenu() {
  const auth = useAuth()
  if (auth.isLoading || auth.mode === 'unconfigured') return null

  if (!auth.isAuthenticated) {
    return (
      <div className={styles.menu}>
        <Button variant="secondary" size="small" onClick={() => void auth.login()}>
          Log in
        </Button>
        <Button size="small" onClick={() => void auth.signup()}>
          Sign up
        </Button>
      </div>
    )
  }

  return (
    <div className={styles.menu}>
      <span className={styles.email} title={auth.user?.email ?? undefined}>
        {auth.user?.email ?? 'Signed in'}
      </span>
      <Button variant="secondary" size="small" onClick={() => void auth.logout()}>
        Log out
      </Button>
    </div>
  )
}
