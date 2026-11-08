import type { Review } from '../../api/reviews.ts'
import CapsMeter from '../../components/ui/CapsMeter.tsx'
import { ClockIcon } from '../../components/ui/icons.tsx'
import { WorthBadge } from '../../components/ui/WorthScore.tsx'
import { DIFFICULTY_LABELS, goalLabel, WORTH_SCORE_LABELS, weeklyHoursLabel, type Score } from '../../domain/reviewVocabulary.ts'
import { postedLabel } from './insights.ts'
import styles from './CoursePage.module.css'

const GOAL_TINTS: Record<string, string> = {
  career_preparation: 'var(--wtc-peach)',
  skill_development: 'var(--wtc-teal)',
  academic_development: 'var(--wtc-lilac)',
  degree_requirements: 'var(--wtc-butter)',
  personal_exploration: 'var(--wtc-mint)',
}

/**
 * One anonymous student review. It shows the course experience only: no
 * reviewer identity, and no professor or semester (the course page is about
 * the course, not who taught it). Owner: FE1 (#22).
 */
export default function ReviewCard({ review }: { review: Review }) {
  return (
    <article className={styles.review}>
      <div className={styles.reviewHead}>
        <WorthBadge score={review.worthScore} />
        <span className={styles.reviewWho}>
          <span className={styles.reviewName}>
            Anonymous student · <span className={styles.reviewWorthWord}>Helped with their goals: {WORTH_SCORE_LABELS[review.worthScore as Score].toLowerCase()}</span>
          </span>
          <span className={styles.reviewDate}>{postedLabel(review.createdAt)}</span>
        </span>
      </div>
      {review.goals.length > 0 && (
        <ul className={styles.goalChips} aria-label="Took it for">
          {review.goals.map((goal) => (
            <li key={goal} style={{ background: GOAL_TINTS[goal] }}>
              {goalLabel(goal)}
            </li>
          ))}
        </ul>
      )}
      {review.feedback && <p className={styles.reviewText}>{review.feedback}</p>}
      <div className={styles.reviewFoot}>
        <span className={styles.reviewStat} title={`Concept difficulty: ${DIFFICULTY_LABELS[review.conceptDifficulty as Score]}`}>
          <CapsMeter value={review.conceptDifficulty} size={17} />
        </span>
        <span className={styles.reviewStat}>
          <ClockIcon size={16} />
          {weeklyHoursLabel(review.weeklyHoursRange)}
          <span className={styles.muted}>a week</span>
        </span>
        {review.skillsGained.length > 0 && <span className={styles.muted}>Gained {review.skillsGained.join(', ')}</span>}
      </div>
    </article>
  )
}
