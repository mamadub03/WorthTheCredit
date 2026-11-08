import { Link } from 'react-router'
import type { CourseSummary } from '../../api/courses.ts'
import { collegeForName } from '../../domain/colleges.ts'
import { paths } from '../../routes/paths.ts'
import CapsMeter from './CapsMeter.tsx'
import { Skeleton } from './StateMessage.tsx'
import { reviewCountLabel } from './format.ts'
import { WorthBadge } from './WorthScore.tsx'
import styles from './ui.module.css'

export interface CourseStats {
  worthScore: number | null
  reviewCount: number
  averageDifficulty: number | null
}

interface CourseCardProps {
  course: CourseSummary
  /** Worth Score and difficulty, loaded separately. Undefined while loading, null if it failed. */
  stats?: CourseStats | null
}

/**
 * One course in search results and on the home page: Worth Score, code,
 * title, college and difficulty. The whole card links to the course page.
 * Owner: FE1 (#20).
 */
export default function CourseCard({ course, stats }: CourseCardProps) {
  const college = collegeForName(course.college)
  return (
    <Link to={paths.course(course.id)} className={styles.courseCard}>
      {stats === undefined ? <Skeleton width={56} height={56} radius={16} /> : <WorthBadge score={stats?.worthScore ?? null} size="large" />}
      <span className={styles.courseBody}>
        <span className={styles.courseMeta}>
          {college && <img className={styles.courseMark} src={college.mark} alt="" />}
          {course.code}
          {college && <span className={styles.courseCollege}> · {college.name}</span>}
        </span>
        <span className={styles.courseTitle}>{course.title}</span>
        <span className={styles.courseStats}>
          {stats === undefined ? (
            <Skeleton width={140} height={12} />
          ) : stats && stats.reviewCount > 0 ? (
            <>
              {stats.averageDifficulty !== null && <CapsMeter value={stats.averageDifficulty} size={16} />}
              <span>{reviewCountLabel(stats.reviewCount)}</span>
            </>
          ) : (
            <span>No reviews yet</span>
          )}
        </span>
      </span>
    </Link>
  )
}

export function CourseCardSkeleton() {
  return (
    <div className={styles.courseCard} aria-hidden="true">
      <Skeleton width={56} height={56} radius={16} />
      <span className={styles.courseBody}>
        <Skeleton width={90} height={11} />
        <Skeleton width="70%" height={16} />
        <Skeleton width={140} height={12} />
      </span>
    </div>
  )
}
