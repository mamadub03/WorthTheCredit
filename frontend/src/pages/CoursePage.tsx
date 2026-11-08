import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { getCourse, searchCourses, type CourseDetail } from '../api/courses.ts'
import { getWorthScore } from '../api/reviews.ts'
import CapsMeter from '../components/ui/CapsMeter.tsx'
import { ClockIcon, PencilIcon, SearchIcon } from '../components/ui/icons.tsx'
import StateMessage, { ErrorMessage, Skeleton } from '../components/ui/StateMessage.tsx'
import { reviewCountLabel } from '../components/ui/format.ts'
import { WorthBadge } from '../components/ui/WorthScore.tsx'
import { collegeForName } from '../domain/colleges.ts'
import { DIFFICULTY_HINT, DIFFICULTY_LABELS, formatAverage, WEEKLY_HOURS, weeklyHoursLabel, type Score } from '../domain/reviewVocabulary.ts'
import { errorMessage, isNotFound, useApiQuery } from '../hooks/useApiQuery.ts'
import { useCourseReviews } from '../hooks/useCourseReviews.ts'
import { useCourseStats } from '../hooks/useCourseStats.ts'
import { coursesSearch } from '../routes/discoveryPaths.ts'
import { paths } from '../routes/paths.ts'
import { goalShares, mostCommonHours, topSkills, worthDistribution } from './course/insights.ts'
import ReviewCard from './course/ReviewCard.tsx'
import styles from './course/CoursePage.module.css'

const TINTS = ['var(--wtc-peach)', 'var(--wtc-teal)', 'var(--wtc-lilac)', 'var(--wtc-butter)', 'var(--wtc-mint)']
const GOAL_BARS = ['#f76902', '#009cbd', '#7d55c7', '#f6be00', '#84bd00']
const REVIEWS_SHOWN = 5

/**
 * /courses/:courseId: what the course is, its Community Worth Score,
 * difficulty and weekly time, why students took it, what they gained, and
 * every review. Owner: FE1 (#21, #22).
 */
export default function CoursePage() {
  const { courseId = '' } = useParams()
  const course = useApiQuery(`course:${courseId}`, (client, signal) => getCourse(client, courseId, signal))

  if (course.state.status === 'loading') return <CourseSkeleton />
  if (course.state.status === 'error') {
    if (isNotFound(course.state.error)) {
      return (
        <StateMessage
          tint="peach"
          art={<SearchIcon size={36} />}
          title="We couldn’t find that course"
          actions={
            <Link to={coursesSearch()} className="wtc-btn wtc-btn-orange">
              Search courses
            </Link>
          }
        >
          <p>The link may be old, or the course isn’t offered anymore.</p>
        </StateMessage>
      )
    }
    return <ErrorMessage message={errorMessage(course.state.error)} onRetry={course.retry} />
  }
  // key: a fresh page (and fresh loads) when you jump to another course.
  return <CourseView key={course.state.data.id} course={course.state.data} />
}

function CourseView({ course }: { course: CourseDetail }) {
  const college = collegeForName(course.college)
  const reviews = useCourseReviews(course.id)
  const summary = useApiQuery(`worth:${course.id}`, (client, signal) => getWorthScore(client, course.id, signal))
  const [shown, setShown] = useState(REVIEWS_SHOWN)

  const hasReviews = course.worthScore !== null && course.reviewCount > 0
  const loaded = reviews.reviews
  const workload = summary.state.status === 'success' ? summary.state.data.workload : null
  const commonHours = workload ? mostCommonHours(workload) : null
  const workloadTotal = workload ? WEEKLY_HOURS.reduce((sum, { key }) => sum + workload[key], 0) : 0
  const sampleNote = reviews.total > loaded.length ? ` (from the ${loaded.length} newest of ${reviews.total})` : ''

  return (
    <div className={styles.page}>
      <nav aria-label="Breadcrumb" className={`${styles.crumbs} wtc-rise`}>
        <Link to={coursesSearch()}>Courses</Link>
        <span aria-hidden="true">/</span>
        {college && (
          <>
            <Link to={coursesSearch({ college: college.key })}>{college.name}</Link>
            <span aria-hidden="true">/</span>
          </>
        )}
        <span aria-current="page">{course.code}</span>
      </nav>

      <section className={styles.head}>
        <div className={`${styles.headText} wtc-rise wtc-d1`}>
          <span className={styles.codeChip} style={{ background: college ? `var(--wtc-${college.tint})` : undefined }}>
            {course.code}
            {course.credits !== null && ` · ${course.credits} credits`}
          </span>
          <h1 className={styles.title}>{course.title}</h1>
          <p className={styles.where}>
            {college && <img src={college.mark} alt="" className={styles.mark} />}
            {[course.department, course.college, course.campus].filter(Boolean).join(' · ')}
          </p>
          <div className={styles.actions}>
            <Link to={paths.writeReview(course.id)} className="wtc-btn wtc-btn-orange">
              <PencilIcon size={18} /> Write a review
            </Link>
          </div>
        </div>
        {college && <img className={`${styles.photo} wtc-rise wtc-d2`} src={college.photo} alt={college.photoAlt} />}
      </section>

      <section aria-label="Scores" className={`${styles.scores} wtc-rise wtc-d2`}>
        <div className={`${styles.scoreCard} ${styles.worthCard}`}>
          {hasReviews ? (
            <>
              <div className={styles.worthTop}>
                <span className={styles.worthNumber}>{formatAverage(course.worthScore ?? 0)}</span>
                <span className={styles.worthMeta}>
                  <strong>Worth Score</strong>
                  <span>
                    out of 5 · {reviewCountLabel(course.reviewCount)}
                  </span>
                </span>
              </div>
              <p className={styles.cardHint}>How well the course helped students reach the goals they took it for.</p>
              {loaded.length > 0 && (
                <ul className={styles.dist} aria-label={`Worth Scores given${sampleNote}`}>
                  {worthDistribution(loaded).map((row) => (
                    <li key={row.score}>
                      <span>{row.score}</span>
                      <span className={styles.distTrack}>
                        <span className={styles.distBar} style={{ width: `${row.pct}%` }} />
                      </span>
                      <span>{row.pct}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className={styles.noReviews}>
              <span className={styles.worthMeta}>
                <strong>Worth Score</strong>
                <span>No reviews yet</span>
              </span>
              <p>Took it? Be the first to say if it was worth the credit.</p>
              <Link to={paths.writeReview(course.id)} className="wtc-btn wtc-btn-dark">
                Write the first review
              </Link>
            </div>
          )}
        </div>

        <div className={styles.scoreCard}>
          <span className={styles.cardLabel}>Concept difficulty</span>
          {course.averageDifficulty !== null && hasReviews ? (
            <div className={styles.diffRow}>
              <CapsMeter value={course.averageDifficulty} size={32} animate />
              <span className={styles.bigNumber}>{formatAverage(course.averageDifficulty)}</span>
              <span className={styles.muted}>{DIFFICULTY_LABELS[Math.min(5, Math.max(1, Math.round(course.averageDifficulty))) as Score]}</span>
            </div>
          ) : (
            <p className={styles.empty}>No ratings yet</p>
          )}
          <p className={styles.cardHint}>{DIFFICULTY_HINT}</p>
        </div>

        <div className={styles.scoreCard}>
          <span className={styles.cardLabel}>Weekly time outside class</span>
          {summary.state.status === 'loading' ? (
            <Skeleton width={160} height={34} />
          ) : commonHours && workload ? (
            <>
              <div className={styles.diffRow}>
                <ClockIcon size={38} face="var(--wtc-butter)" />
                <span className={styles.bigNumber}>{weeklyHoursLabel(commonHours).replace(' hours', 'h')}</span>
              </div>
              <ul className={styles.hours} aria-label="How many hours reviewers reported">
                {WEEKLY_HOURS.map(({ key, label }) => (
                  <li key={key} className={key === commonHours ? styles.hoursTop : undefined}>
                    <span className={styles.hoursBar} style={{ height: `${workloadTotal ? Math.max(6, (workload[key] / workloadTotal) * 100) : 6}%` }} />
                    <span className={styles.hoursKey}>{key}</span>
                    <span className="wtc-sr">
                      {label}: {workload[key]}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className={styles.empty}>No reports yet</p>
          )}
        </div>
      </section>

      <div className={styles.columns}>
        <div className={styles.main}>
          {loaded.length > 0 && (
            <div className={styles.insights}>
              <section aria-labelledby="why-heading" className={styles.panel}>
                <h2 id="why-heading">Why students took it</h2>
                <ul className={styles.goalBars}>
                  {goalShares(loaded).map((share, i) => (
                    <li key={share.key}>
                      <span className={styles.goalLine}>
                        <span>{share.label}</span>
                        <span>{share.pct}%</span>
                      </span>
                      <span className={styles.goalTrack}>
                        <span style={{ width: `${share.pct}%`, background: GOAL_BARS[i % GOAL_BARS.length] }} />
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
              <section aria-labelledby="skills-heading" className={styles.panel}>
                <h2 id="skills-heading">Skills students gained</h2>
                {topSkills(loaded).length > 0 ? (
                  <ul className={styles.skills}>
                    {topSkills(loaded).map((skill, i) => (
                      <li key={skill.name} style={{ background: TINTS[i % TINTS.length] }}>
                        {skill.name} <span className={styles.muted}>{skill.count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.empty}>No skills listed yet</p>
                )}
              </section>
            </div>
          )}

          <section aria-labelledby="reviews-heading" className={styles.reviews}>
            <h2 id="reviews-heading" className={styles.reviewsHeading}>
              {course.reviewCount > 0 ? `${course.reviewCount === 1 ? '1 student review' : `${course.reviewCount} student reviews`}` : 'Student reviews'}
            </h2>
            {reviews.status === 'loading' && (
              <div className={styles.review} aria-hidden="true">
                <Skeleton width="40%" height={14} />
                <Skeleton height={14} />
                <Skeleton width="80%" height={14} />
              </div>
            )}
            {reviews.status === 'error' && <ErrorMessage message={errorMessage(reviews.error)} onRetry={reviews.retry} />}
            {reviews.status === 'success' && loaded.length === 0 && (
              <p className={styles.panel}>
                No reviews yet. <Link to={paths.writeReview(course.id)}>Write the first one.</Link>
              </p>
            )}
            {loaded.slice(0, shown).map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
            {(shown < loaded.length || loaded.length < reviews.total) && (
              <button
                type="button"
                className={`wtc-btn wtc-btn-white ${styles.moreButton}`}
                disabled={reviews.loadingMore}
                onClick={() => {
                  if (shown + REVIEWS_SHOWN > loaded.length && loaded.length < reviews.total) reviews.loadMore()
                  setShown((n) => n + REVIEWS_SHOWN)
                }}
              >
                {reviews.loadingMore ? 'Loading…' : 'Show more reviews'}
              </button>
            )}
          </section>
        </div>

        <aside className={styles.side}>
          <section aria-labelledby="catalog-heading" className={styles.panel}>
            <h2 id="catalog-heading">From the RIT catalog</h2>
            {course.description && <p className={styles.description}>{course.description}</p>}
            <dl className={styles.facts}>
              <dt>Credits</dt>
              <dd>{course.credits ?? 'Not listed'}</dd>
              <dt>Prerequisites</dt>
              <dd>{course.prerequisites ?? 'None listed'}</dd>
              <dt>College</dt>
              <dd>{course.college ?? 'Not listed'}</dd>
              <dt>Campus</dt>
              <dd>{course.campus ?? 'Not listed'}</dd>
            </dl>
          </section>
          <SimilarCourses course={course} />
        </aside>
      </div>
    </div>
  )
}

/** Other courses from the same department. */
function SimilarCourses({ course }: { course: CourseDetail }) {
  const department = course.department ?? ''
  const similar = useApiQuery(department ? `similar:${department}` : null, (client, signal) => searchCourses(client, { department, limit: 8 }, signal))
  const others = similar.state.status === 'success' ? similar.state.data.results.filter((other) => other.id !== course.id).slice(0, 3) : []
  const stats = useCourseStats(others.map((other) => other.id))
  if (!department || others.length === 0) return null
  return (
    <section aria-labelledby="similar-heading" className={styles.panel}>
      <h2 id="similar-heading">More from {department}</h2>
      <ul className={styles.similar}>
        {others.map((other) => (
          <li key={other.id}>
            <Link to={paths.course(other.id)} className={styles.similarLink}>
              {other.id in stats ? <WorthBadge score={stats[other.id]?.worthScore ?? null} /> : <Skeleton width={44} height={44} radius={14} />}
              <span className={styles.similarText}>
                <span className={styles.similarCode}>{other.code}</span>
                <span className={styles.similarTitle}>{other.title}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function CourseSkeleton() {
  return (
    <div className={styles.page} aria-busy="true">
      <span role="status" className="wtc-sr">
        Loading course
      </span>
      <Skeleton width={180} height={14} />
      <div className={styles.head}>
        <div className={styles.headText}>
          <Skeleton width={140} height={30} radius={999} />
          <Skeleton width="80%" height={48} radius={12} />
          <Skeleton width="60%" height={16} />
        </div>
        <Skeleton width={420} height={240} radius={32} />
      </div>
      <div className={styles.scores}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={180} radius={28} />
        ))}
      </div>
    </div>
  )
}
