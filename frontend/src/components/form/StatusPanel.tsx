import { useId, type ReactNode } from 'react'
import styles from './StatusPanel.module.css'

interface StatusPanelProps {
  /** A short label above the title, like "One more step". */
  tag?: string
  title: string
  /** Paragraphs under the title. */
  children?: ReactNode
  /** Buttons or links under the text. */
  actions?: ReactNode
  /** Announce changes to screen readers, for states that resolve on their own ("Signing you in"). */
  live?: boolean
}

/**
 * A full-page message in the College carousel style: sign-in states, the
 * verify-email step, and other moments that replace a page's content. A white
 * card on the cream page that rises in with Grace's global wtc-rise. Owner: FE2.
 */
export default function StatusPanel({ tag, title, children, actions, live = false }: StatusPanelProps) {
  const titleId = useId()
  return (
    <section className={`${styles.panel} wtc-rise`} aria-labelledby={titleId} aria-live={live ? 'polite' : undefined}>
      {tag ? <span className={styles.tag}>{tag}</span> : null}
      <h1 id={titleId} className={styles.title}>
        {title}
      </h1>
      {children ? <div className={styles.body}>{children}</div> : null}
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </section>
  )
}
