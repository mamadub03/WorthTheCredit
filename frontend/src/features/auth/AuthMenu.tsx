import { useLocation } from 'react-router'
import Button from '../../components/form/Button.tsx'
import ButtonLink from '../../components/form/ButtonLink.tsx'
import { paths } from '../../routes/paths.ts'
import { useAuth } from './authContext.ts'
import styles from './AuthMenu.module.css'

/**
 * Sign-in controls at the right end of FE1's header, in the Example B style:
 * a dark "Sign in" pill that opens /signin, or the student's account and
 * "Log out". Shows nothing while sign-in state loads, so "Sign in" doesn't
 * flash on reload. Owner: FE2 (#26).
 */
export default function AuthMenu() {
  const auth = useAuth()
  const location = useLocation()
  if (auth.isLoading || auth.mode === 'unconfigured') return null

  if (!auth.isAuthenticated) {
    const onSignInPage = location.pathname === paths.signIn()
    const here = location.pathname + location.search
    return (
      <div className={styles.menu}>
        <ButtonLink
          to={onSignInPage ? here : paths.signIn(here === paths.home ? undefined : here)}
          variant="dark"
          size="small"
          aria-current={onSignInPage ? 'page' : undefined}
        >
          Sign in
        </ButtonLink>
      </div>
    )
  }

  const label = auth.user?.email ?? auth.user?.name ?? 'your account'
  return (
    <div className={styles.menu}>
      <span className={styles.account} title={label}>
        <span className={styles.avatar} aria-hidden="true">
          {label.charAt(0).toUpperCase()}
        </span>
        <span className={styles.who}>
          <span className={styles.visuallyHidden}>Signed in as </span>
          {label}
        </span>
      </span>
      <Button variant="secondary" size="small" onClick={() => void auth.logout()}>
        Log out
      </Button>
    </div>
  )
}
