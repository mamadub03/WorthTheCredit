import { useId } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router'
import Button from '../../components/form/Button.tsx'
import Coin from '../../components/ui/Coin.tsx'
import { PencilIcon, SearchIcon, SparkIcon } from '../../components/ui/icons.tsx'
import { COURSES_PATH } from '../../routes/discoveryPaths.ts'
import { signInReturnPath } from '../../routes/paths.ts'
import AuthStatusPanel from './AuthStatusPanel.tsx'
import { useAuth } from './authContext.ts'
import styles from './SignInPage.module.css'

/**
 * What an account adds, from the College carousel sign-in board. The board's
 * first perk, "Save a shortlist", is left out: the app has no shortlist.
 */
const PERKS = [
  { title: 'Get AI matches', text: 'Courses picked for your major, skills and career goals.', Icon: SparkIcon, tint: styles.tintTeal },
  { title: 'Review your classes', text: 'One review per course, posted anonymously.', Icon: PencilIcon, tint: styles.tintMint },
  { title: 'Browsing stays free', text: 'Search courses and read reviews without signing in.', Icon: SearchIcon, tint: styles.tintLilac },
]
const PERK_DELAYS = ['wtc-d1', 'wtc-d2', 'wtc-d3']

/**
 * /signin, the College carousel sign-in board: a welcome card with the tossing
 * coin beside what an account adds (below it on phones). "Continue with email"
 * and "Create an account" open Auth0 (or dev sign-in), then return to ?next=
 * when it stays on this site. Signed-in visitors go straight there. Owner: FE2.
 */
export default function SignInPage() {
  const auth = useAuth()
  const [params] = useSearchParams()
  const returnTo = signInReturnPath(params.get('next'))
  const id = useId()
  const titleId = `${id}-title`
  const perksId = `${id}-perks`

  if (auth.mode === 'unconfigured') {
    return <AuthStatusPanel title="Sign-in isn't set up yet">{auth.error ? <p>{auth.error.message}</p> : null}</AuthStatusPanel>
  }
  if (auth.isLoading) return <AuthStatusPanel title="Checking your sign-in" live />
  if (auth.isAuthenticated) return <Navigate to={returnTo} replace />

  return (
    <div className={styles.page}>
      <section className={`${styles.card} wtc-rise`} aria-labelledby={titleId}>
        {/* Two sizes of Grace's coin, one per width; both are decorative. */}
        <span className={styles.coinWide}>
          <Coin size={132} />
        </span>
        <span className={styles.coinPhone}>
          <Coin size={110} />
        </span>
        <h1 id={titleId} className={styles.title}>
          {/* The wordmark's orange letters, read out as one phrase. */}
          <span aria-hidden="true">
            Welcome to worth the c<span className={styles.accent}>R</span>ed<span className={styles.accent}>IT</span>
          </span>
          <span className="wtc-sr">Welcome to worth the cRedIT</span>
        </h1>
        <p className={styles.lead}>Sign in to get AI matches and review the classes you’ve taken.</p>
        {auth.error ? (
          <p className={styles.error} role="alert">
            Sign-in didn't finish: {auth.error.message}
          </p>
        ) : null}
        <Button size="large" className={`${styles.cta} ${styles.primary}`} onClick={() => void auth.login({ returnTo })}>
          <MailIcon />
          Continue with email
        </Button>
        <Button variant="dark" size="large" className={`${styles.cta} ${styles.dark}`} onClick={() => void auth.signup({ returnTo })}>
          Create an account
        </Button>
        <p className={styles.note}>
          {auth.mode === 'dev'
            ? 'Dev sign-in is on, so both buttons sign you in as a test student.'
            : 'Secure sign-in through Auth0. We’ll send a verification email before you can post reviews.'}
        </p>
        <Link className={styles.browse} to={COURSES_PATH}>
          Keep browsing without an account →
        </Link>
      </section>

      <section className={styles.perks} aria-labelledby={perksId}>
        <h2 id={perksId} className={`${styles.perksTitle} wtc-rise wtc-d1`}>
          With an account you can
        </h2>
        <ul className={styles.perkList}>
          {PERKS.map(({ title, text, Icon, tint }, index) => (
            <li key={title} className={`${styles.perk} wtc-rise ${PERK_DELAYS[index]}`}>
              <span className={`${styles.perkIcon} ${tint}`}>
                <Icon size={26} />
              </span>
              <span className={styles.perkText}>
                <span className={styles.perkTitle}>{title}</span>
                <span className={styles.perkDetail}>{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

/** The board's envelope, drawn before "Continue with email". */
function MailIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  )
}
