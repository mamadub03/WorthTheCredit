import { env } from '../../config/env.ts'
import styles from './DemoDataBanner.module.css'

/**
 * Says so whenever the app shows sample data or a fake sign-in (project.mdc:
 * "Keep generated demo data clearly distinguishable from real student reviews").
 * Renders nothing against the real API with real sign-in. Owner: FE2 (#25).
 */
export default function DemoDataBanner() {
  const mocked = env.mockDomains.size > 0
  if (!mocked && !env.devAuth) return null
  const notes: string[] = []
  if (mocked) notes.push('Demo mode: sample data, not real student reviews.')
  if (env.devAuth) notes.push('Dev sign-in is on, so you are signed in as a test student.')
  return (
    <p className={styles.banner} role="note">
      {notes.join(' ')}
    </p>
  )
}
