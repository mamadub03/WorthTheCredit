import { useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigationType } from 'react-router'
import DemoDataBanner from '../api/mock/DemoDataBanner.tsx'
import logoUrl from '../assets/brand/logo-horizontal.svg'
import { HomeIcon, PencilIcon, SearchIcon, SparkIcon } from '../components/ui/icons.tsx'
import { PHOTO_CREDITS } from '../domain/colleges.ts'
import AuthMenu from '../features/auth/AuthMenu.tsx'
import { COURSES_PATH } from '../routes/discoveryPaths.ts'
import { paths } from '../routes/paths.ts'
import styles from './AppLayout.module.css'

const NAV = [
  { to: COURSES_PATH, label: 'Courses', icon: SearchIcon, matches: (path: string) => path.startsWith('/courses') },
  { to: paths.recommendations, label: 'AI match', icon: SparkIcon, matches: (path: string) => path.startsWith(paths.recommendations) },
  { to: paths.writeReview(), label: 'Write a review', icon: PencilIcon, matches: (path: string) => path.startsWith(paths.writeReview()) },
]

/**
 * The frame around every page: the top nav with the logo in the middle,
 * FE2's sign-in menu and demo banner, the footer, and on phones a floating
 * tab bar at the bottom. FE2's pages render inside it too. Owner: FE1 (#19).
 */
export default function AppLayout() {
  const { pathname } = useLocation()
  // Each new page starts at the top; Back and Forward keep the browser's own scroll restore.
  const navigationType = useNavigationType()
  useEffect(() => {
    if (navigationType !== 'POP') window.scrollTo(0, 0)
  }, [pathname, navigationType])
  const tabs = [{ to: paths.home, label: 'Home', icon: HomeIcon, matches: (path: string) => path === paths.home }, ...NAV]

  return (
    <div className={styles.app}>
      <a className={styles.skip} href="#main">
        Skip to content
      </a>
      <header className={styles.header}>
        <nav className={styles.nav} aria-label="Main">
          <div className={styles.links}>
            {NAV.map((item) => (
              <Link key={item.to} to={item.to} className={styles.link} aria-current={item.matches(pathname) ? 'page' : undefined}>
                {item.label}
              </Link>
            ))}
          </div>
          <Link to={paths.home} className={styles.logo}>
            <img src={logoUrl} alt="worth the cRedIT, home" />
          </Link>
          <div className={styles.account}>
            <AuthMenu />
          </div>
        </nav>
      </header>
      <DemoDataBanner />

      <main id="main" className={styles.main}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <img src={logoUrl} alt="worth the cRedIT" className={styles.footerLogo} />
        <span className={styles.footerBreak} />
        <span>Made by RIT students. Not an official RIT site.</span>
        <span>Anonymous reviews · One per course</span>
        <span className={styles.credits}>{PHOTO_CREDITS} College marks are originals, not RIT logos.</span>
      </footer>

      <nav className={styles.tabs} aria-label="App">
        {tabs.map(({ to, label, icon: Icon, matches }) => (
          <Link key={to} to={to} className={styles.tab} aria-current={matches(pathname) ? 'page' : undefined}>
            <Icon size={20} />
            {label === 'Write a review' ? 'Review' : label === 'AI match' ? 'Match' : label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
