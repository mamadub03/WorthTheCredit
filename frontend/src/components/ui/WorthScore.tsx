import { formatAverage } from '../../domain/reviewVocabulary.ts'
import { reviewCountLabel } from './format.ts'
import styles from './ui.module.css'

interface WorthBadgeProps {
  score: number | null
  /** Bigger square for course cards. */
  size?: 'small' | 'large'
}

/**
 * A course's Community Worth Score in a peach square: "4.3", or "–" with
 * "No reviews yet" read out when nobody has reviewed it. Never shows 0.
 * Owner: FE1 (#19), following the display rules in docs/frontend-coordination.md §5.
 */
export function WorthBadge({ score, size = 'small' }: WorthBadgeProps) {
  const cls = `${styles.worthBadge} ${size === 'large' ? styles.worthBadgeLarge : ''} ${score === null ? styles.worthBadgeEmpty : ''}`
  if (score === null) {
    return (
      <span className={cls}>
        <span aria-hidden="true">–</span>
        <span className="wtc-sr">No reviews yet</span>
      </span>
    )
  }
  return (
    <span className={cls}>
      <span aria-hidden="true">{formatAverage(score)}</span>
      <span className="wtc-sr">Worth Score {formatAverage(score)} out of 5</span>
    </span>
  )
}

/** "4.3 / 5 · 18 reviews" or "No reviews yet", for lines of text. */
export function WorthLine({ score, count }: { score: number | null; count: number }) {
  if (score === null || count === 0) return <span>No reviews yet</span>
  return (
    <span>
      <strong>{formatAverage(score)} / 5</strong> · {reviewCountLabel(count)}
    </span>
  )
}
