import type { CSSProperties } from 'react'
import { formatAverage } from '../../domain/reviewVocabulary.ts'
import { CAP_PATHS } from './format.ts'
import styles from './ui.module.css'

interface CapsMeterProps {
  /** Concept difficulty from 1 to 5, decimals allowed (3.8 fills 3 caps and most of the 4th). */
  value: number
  /** Width and height of one cap in px. */
  size?: number
  /** Fill from empty when it first appears. */
  animate?: boolean
}

function Caps({ size, filled }: { size: number; filled: boolean }) {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={filled ? 'var(--wtc-orange, #f76902)' : 'none'}
          stroke={filled ? 'var(--wtc-ink, #1e2124)' : '#c8ccce'}
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          {CAP_PATHS.map((d) => (
            <path key={d} d={d} fill={d === CAP_PATHS[2] ? 'none' : undefined} />
          ))}
        </svg>
      ))}
    </>
  )
}

/**
 * Concept difficulty as five graduation caps that fill up, so a 3.8 reads at a glance.
 * Difficulty is shown on its own and never mixed into the Worth Score.
 * Owner: FE1 (#21, #22).
 */
export default function CapsMeter({ value, size = 18, animate = false }: CapsMeterProps) {
  const clamped = Math.min(5, Math.max(0, value))
  const pct = `${(clamped / 5) * 100}%`
  return (
    <span className={styles.caps} style={{ '--caps-w': `${size * 5}px`, height: size } as CSSProperties} title={`Concept difficulty: ${formatAverage(value)} of 5`}>
      <span className="wtc-sr">Concept difficulty {formatAverage(value)} of 5</span>
      <span className={styles.capsRow} aria-hidden="true">
        <Caps size={size} filled={false} />
      </span>
      <span className={`${styles.capsFill} ${animate ? styles.capsAnimate : ''}`} style={{ width: pct, height: size }} aria-hidden="true">
        <span className={styles.capsRow}>
          <Caps size={size} filled />
        </span>
      </span>
    </span>
  )
}
