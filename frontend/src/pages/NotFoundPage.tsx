import { Link } from 'react-router'
import Coin from '../components/ui/Coin.tsx'
import { coursesSearch } from '../routes/discoveryPaths.ts'
import { paths } from '../routes/paths.ts'
import styles from './NotFoundPage.module.css'

/** Any unknown URL. The flipping coin stands in for the 0 in 404. Owner: FE1 (#19). */
export default function NotFoundPage() {
  return (
    <section className={`${styles.box} wtc-rise`} aria-labelledby="nf-heading">
      <p className={styles.code} aria-hidden="true">
        4<Coin size={96} />4
      </p>
      <h1 id="nf-heading" className={styles.title}>
        This page skipped class.
      </h1>
      <p className={styles.text}>The link may be old, or the course isn’t offered anymore. Try searching for it.</p>
      <div className={styles.actions}>
        <Link to={paths.home} className="wtc-btn wtc-btn-dark">
          Go home
        </Link>
        <Link to={coursesSearch()} className="wtc-btn wtc-btn-white">
          Search courses
        </Link>
      </div>
    </section>
  )
}
