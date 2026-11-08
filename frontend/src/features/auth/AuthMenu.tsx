import { useLocation } from 'react-router'
import Button from '../../components/form/Button.tsx'
import ButtonLink from '../../components/form/ButtonLink.tsx'
import { ArrowRightIcon } from '../../components/ui/icons.tsx'
import { paths } from '../../routes/paths.ts'
import { useAuth, type AuthUser } from './authContext.ts'
import styles from './AuthMenu.module.css'

/**
 * Sign-in controls in the right-hand slot of FE1's header, in the College
 * carousel style: the dark "Sign in" pill with its orange arrow dot, which
 * opens /signin and comes back here, or, signed in, the initials avatar and a
 * "Log out" button (the boards draw no account menu, so it stays visible).
 * Shows nothing while sign-in state loads, so "Sign in" doesn't flash on
 * reload. Owner: FE2 (#26).
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
          className={styles.pill}
          aria-current={onSignInPage ? 'page' : undefined}
        >
          Sign in
          <span className={styles.dot}>
            <ArrowRightIcon size={16} strokeWidth={2.4} />
          </span>
        </ButtonLink>
      </div>
    )
  }

  const who = auth.user?.email ?? auth.user?.name ?? null
  const initials = initialsOf(auth.user)
  return (
    <div className={styles.menu}>
      <span className={styles.account} title={who ?? undefined}>
        <span className={styles.avatar} aria-hidden="true">
          {initials ?? <PersonIcon />}
        </span>
        <span className={styles.signedIn}>
          Signed in<span className="wtc-sr">{who ? ` as ${who}` : null}</span>
        </span>
      </span>
      <Button variant="secondary" size="small" className={styles.logout} onClick={() => void auth.logout()}>
        Log out
      </Button>
    </div>
  )
}

/** First letters of the first two name parts, else the email's first letter. */
function initialsOf(user: AuthUser | null): string | null {
  const name = user?.name?.trim()
  // Auth0 often fills name with the email address; that is not a name.
  if (name && !name.includes('@')) {
    const parts = name.split(/\s+/).slice(0, 2)
    return parts.map((part) => part.charAt(0).toUpperCase()).join('')
  }
  const email = user?.email?.trim()
  return email ? email.charAt(0).toUpperCase() : null
}

/** The account glyph from the boards, for a student with no name or email. */
function PersonIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </svg>
  )
}
