import { Link, Navigate, useSearchParams } from 'react-router'
import Button from '../../components/form/Button.tsx'
import StatusPanel from '../../components/form/StatusPanel.tsx'
import { paths, signInReturnPath } from '../../routes/paths.ts'
import { useAuth } from './authContext.ts'
import styles from './SignInPage.module.css'

/** Icon paths from the Example B boards (24px grid, stroked). */
const ICONS = {
  check: 'M5 12.5l4.5 4.5L19 7',
  mail: 'M3 7l9 6 9-6M6 5h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z',
  sparkle: 'M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z',
  pencil: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  bookmark: 'M6 4h12v17l-6-4-6 4z',
}

/** What an account adds. Only features the app has: there is no shortlist yet. */
const PERKS = [
  { title: 'Get AI matches', text: 'Courses picked for your major, skills, and career goals.', icon: ICONS.sparkle, tint: styles.tintBlue },
  { title: 'Review your classes', text: 'One review per course, posted anonymously.', icon: ICONS.pencil, tint: styles.tintGreen },
  { title: 'Keep your answers', text: 'What you tell the AI advisor is saved in this browser for next time.', icon: ICONS.bookmark, tint: styles.tintWarm },
]

/**
 * /signin, the sign-in page from the Example B design. "Continue with email"
 * and "Create an account" open Auth0 (or dev sign-in), then return to
 * ?next=. Signed-in visitors go straight there. Owner: FE2.
 */
export default function SignInPage() {
  const auth = useAuth()
  const [params] = useSearchParams()
  const returnTo = signInReturnPath(params.get('next'))

  if (auth.mode === 'unconfigured') {
    return <StatusPanel title="Sign-in isn't set up yet">{auth.error ? <p>{auth.error.message}</p> : null}</StatusPanel>
  }
  if (auth.isLoading) return <StatusPanel title="Checking your sign-in" live />
  if (auth.isAuthenticated) return <Navigate to={returnTo} replace />

  return (
    <div className={styles.page}>
      <section className={styles.card} aria-labelledby="sign-in-title">
        <span className={styles.mark}>
          <Icon path={ICONS.check} size={28} strokeWidth={2.6} />
        </span>
        <h1 id="sign-in-title" className={styles.title}>
          Welcome to WorthTheCredit
        </h1>
        <p className={styles.lead}>Sign in to get AI course matches and review classes you've taken.</p>
        {auth.error ? (
          <p className={styles.error} role="alert">
            Sign-in didn't finish: {auth.error.message}
          </p>
        ) : null}
        <Button className={styles.cta} onClick={() => void auth.login({ returnTo })}>
          <Icon path={ICONS.mail} size={20} strokeWidth={2.2} />
          Continue with email
        </Button>
        <Button variant="secondary" className={styles.cta} onClick={() => void auth.signup({ returnTo })}>
          Create an account
        </Button>
        <p className={styles.note}>
          {auth.mode === 'dev'
            ? 'Dev sign-in is on, so both buttons sign you in as a test student.'
            : "Secure sign-in through Auth0. We'll send a verification email before you can post reviews."}
        </p>
        <Link className={styles.browse} to={paths.home}>
          Keep browsing without an account →
        </Link>
      </section>

      <section className={styles.perks} aria-labelledby="sign-in-perks">
        <h2 id="sign-in-perks" className={styles.perksTitle}>
          With an account you can
        </h2>
        <ul className={styles.perkList}>
          {PERKS.map((perk) => (
            <li key={perk.title} className={styles.perk}>
              <span className={`${styles.perkIcon} ${perk.tint}`}>
                <Icon path={perk.icon} size={24} strokeWidth={2} />
              </span>
              <span className={styles.perkText}>
                <span className={styles.perkTitle}>{perk.title}</span>
                <span className={styles.perkDetail}>{perk.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function Icon({ path, size, strokeWidth }: { path: string; size: number; strokeWidth: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={path} />
    </svg>
  )
}
