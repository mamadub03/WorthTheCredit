import { Link } from 'react-router'
import type { CourseSummary } from '../../api/courses.ts'
import { GOAL_STYLE, hoursShort, tintColors } from '../../domain/goalStyles.ts'
import { formatAverage } from '../../domain/reviewVocabulary.ts'
import type { CourseGoals, CourseStats } from '../../hooks/useCourseInsights.ts'
import { paths } from '../../routes/paths.ts'
import CapsMeter from './CapsMeter.tsx'
import { reviewCountLabel } from './format.ts'
import { ClockIcon } from './icons.tsx'
import { Skeleton } from './StateMessage.tsx'
import styles from './CourseCard.module.css'

interface CourseCardProps {
  course: CourseSummary
  /** Undefined while loading, null if it failed to load. */
  stats: CourseStats | null | undefined
  goals?: CourseGoals | null
}

/**
 * A course in the design's card style: a top panel tinted by the main reason
 * students took it, with the Worth Score, then the code, review count, title,
 * difficulty caps and typical weekly hours. The card links to the course page.
 * Owner: FE1 (#20).
 */
export default function CourseCard({ course, stats, goals }: CourseCardProps) {
  if (stats === undefined) return <CourseCardSkeleton />
  const reviewed = !!stats && stats.reviewCount > 0 && stats.worthScore !== null
  const topGoal = goals?.topGoal ?? null
  const tint = reviewed && topGoal ? tintColors(GOAL_STYLE[topGoal].tint) : reviewed ? tintColors('peach') : { bg: '#ecedee', fg: '#3a4044' }

  return (
    <Link to={paths.course(course.id)} className={styles.card}>
      <span className={styles.top} style={{ background: tint.bg }}>
        <span className={styles.reason} style={{ color: tint.fg }}>
          {!reviewed ? 'No reviews yet' : topGoal ? `Top reason: ${GOAL_STYLE[topGoal].short}` : goals === undefined ? ' ' : 'Worth Score'}
        </span>
        {reviewed ? (
          <span className={styles.score}>
            <span aria-hidden="true">{formatAverage(stats.worthScore!)}</span>
            <span className="wtc-sr">Worth Score {formatAverage(stats.worthScore!)} out of 5</span>
          </span>
        ) : (
          <span className={styles.noScore}>No score yet</span>
        )}
      </span>
      <span className={styles.body}>
        <span className={styles.meta}>
          {course.code} · {reviewed ? reviewCountLabel(stats.reviewCount) : 'Took it? Be the first to review'}
        </span>
        <span className={styles.title}>{course.title}</span>
        {reviewed && (
          <span className={styles.stats}>
            {stats.averageDifficulty !== null ? (
              <span className={styles.diff}>
                <CapsMeter value={stats.averageDifficulty} size={19} />
                <span className={styles.diffNumber} aria-hidden="true">
                  {formatAverage(stats.averageDifficulty)}
                </span>
              </span>
            ) : (
              <span />
            )}
            {stats.commonHours && (
              <span className={styles.hours} title="Hours per week students reported">
                <ClockIcon size={17} />
                <span>
                  {hoursShort(stats.commonHours)}h<span className={styles.unit}>/wk</span>
                </span>
              </span>
            )}
          </span>
        )}
      </span>
    </Link>
  )
}

export function CourseCardSkeleton() {
  return (
    <div className={styles.card} aria-hidden="true">
      <span className={styles.top} style={{ background: '#f3f1ec' }}>
        <Skeleton width={110} height={11} />
        <Skeleton width={70} height={36} />
      </span>
      <span className={styles.body}>
        <Skeleton width={120} height={11} />
        <Skeleton width="85%" height={18} />
        <Skeleton width="60%" height={14} />
      </span>
    </div>
  )
}

/** The little key the design puts above course grids. */
export function CardLegend() {
  return (
    <span className={styles.legend}>
      <span>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="#f76902" stroke="#1e2124" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 9.5L12 5l10 4.5L12 14z" />
          <path d="M6 11.5V16c0 1.2 2.7 2.5 6 2.5s6-1.3 6-2.5v-4.5" />
          <path d="M21 10v5" fill="none" />
        </svg>
        Concept difficulty
      </span>
      <span>
        <ClockIcon size={15} />
        Hours per week
      </span>
    </span>
  )
}
