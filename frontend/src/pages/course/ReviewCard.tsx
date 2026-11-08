import type { Review } from '../../api/reviews.ts'
import CapsMeter from '../../components/ui/CapsMeter.tsx'
import { ClockIcon } from '../../components/ui/icons.tsx'
import { WorthBadge } from '../../components/ui/WorthScore.tsx'
import { GOAL_STYLE, hoursShort } from '../../domain/goalStyles.ts'
import { postedLabel } from './insights.ts'
import styles from './CoursePage.module.css'

/**
 * One anonymous review, laid out like the design's review card: Worth Score,
 * when it was posted, what the student took it for, their words, then
 * difficulty, weekly hours and skills. No reviewer identity, professor or
 * semester. Owner: FE1 (#22).
 */
export default function ReviewCard({ review }: { review: Review }) {
  return (
    <article className={styles.review}>
      <div className={styles.reviewHead}>
        <div className={styles.reviewWho}>
          <WorthBadge score={review.worthScore} />
          <span className={styles.reviewWhoText}>
            <span className={styles.reviewName}>{postedLabel(review.createdAt)}</span>
            <span className={styles.reviewDate}>Anonymous student</span>
          </span>
        </div>
        {review.goals.length > 0 && (
          <span className={styles.tookFor} style={{ background: `var(--wtc-${GOAL_STYLE[review.goals[0]].tint})` }}>
            Took it for {review.goals.map((goal) => GOAL_STYLE[goal].short.toLowerCase()).join(' + ')}
          </span>
        )}
      </div>
      {review.feedback && <p className={styles.reviewText}>{review.feedback}</p>}
      <div className={styles.reviewFoot}>
        <span className={styles.reviewStat}>
          <CapsMeter value={review.conceptDifficulty} size={17} />
        </span>
        <span className={styles.reviewStat} title="Hours per week">
          <ClockIcon size={16} />
          {hoursShort(review.weeklyHoursRange)}h<span className={styles.muted}>/wk</span>
        </span>
        {review.skillsGained.length > 0 && <span className={styles.muted}>Gained {review.skillsGained.join(', ')}</span>}
      </div>
    </article>
  )
}
