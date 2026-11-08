import type { ReactNode } from 'react'
import { RetryIcon } from './icons.tsx'
import styles from './ui.module.css'

interface StateMessageProps {
  /** A small illustration or icon, shown in a tinted tile. */
  art?: ReactNode
  tint?: 'peach' | 'teal' | 'lilac' | 'butter' | 'mint'
  title: string
  children?: ReactNode
  actions?: ReactNode
  /** Errors are announced to screen readers. */
  role?: 'alert' | 'status'
}

/**
 * Empty and error states: what happened and one clear next step.
 * Owner: FE1 (#19, #24).
 */
export default function StateMessage({ art, tint = 'teal', title, children, actions, role }: StateMessageProps) {
  return (
    <div className={styles.state} role={role}>
      {art && <span className={`${styles.stateArt} ${styles[`tint_${tint}`]}`}>{art}</span>}
      <h2 className={styles.stateTitle}>{title}</h2>
      {children && <div className={styles.stateText}>{children}</div>}
      {actions && <div className={styles.stateActions}>{actions}</div>}
    </div>
  )
}

export function ErrorMessage({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <StateMessage
      role="alert"
      tint="butter"
      title="That didn’t load"
      art={<RetryIcon size={30} />}
      actions={
        <button type="button" className="wtc-btn wtc-btn-dark" onClick={onRetry}>
          <RetryIcon size={16} />
          Try again
        </button>
      }
    >
      <p>{message}</p>
    </StateMessage>
  )
}

/** Gray placeholder blocks that shimmer while something loads. */
export function Skeleton({ width = '100%', height = 14, radius = 8 }: { width?: number | string; height?: number; radius?: number }) {
  return <span className={styles.skeleton} style={{ width, height, borderRadius: radius }} aria-hidden="true" />
}
