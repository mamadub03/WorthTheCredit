import { Link, useNavigate } from 'react-router'
import { searchCourses } from '../api/courses.ts'
import Coin from '../components/ui/Coin.tsx'
import CourseCard, { CardLegend, CourseCardSkeleton } from '../components/ui/CourseCard.tsx'
import { formatAverage } from '../domain/reviewVocabulary.ts'
import { ArrowRightIcon, ClockIcon } from '../components/ui/icons.tsx'
import SearchBar, { DepartmentSelect } from '../components/ui/SearchBar.tsx'
import { ErrorMessage } from '../components/ui/StateMessage.tsx'
import { GOAL_STYLE, hoursShort, tintColors } from '../domain/goalStyles.ts'
import { errorMessage, useApiQuery } from '../hooks/useApiQuery.ts'
import { useCourseInsights } from '../hooks/useCourseInsights.ts'
import { coursesSearch } from '../routes/discoveryPaths.ts'
import { paths } from '../routes/paths.ts'
import CollegeCarousel from './home/CollegeCarousel.tsx'
import styles from './HomePage.module.css'

/**
 * One API page, which is the whole demo catalog. The API can't sort by Worth
 * Score yet, so each course's score loads and the top four are picked here.
 */
const CATALOG_LIMIT = 100

/**
 * Home, built from the Carousel-Home board: the coin and the big question,
 * search with a Department filter, the spinning wall of colleges, the
 * best-reviewed courses, and the AI course advisor. Owner: FE1 (#20).
 */
export default function HomePage() {
  const navigate = useNavigate()
  const catalog = useApiQuery('home-catalog', (client, signal) => searchCourses(client, { limit: CATALOG_LIMIT }, signal))
  const courses = catalog.state.status === 'success' ? catalog.state.data.results : []
  const departments = [...new Set(courses.map((course) => course.department).filter((d): d is string => !!d))].sort()

  // Scores for every course, to rank them; the top reason only for the four shown.
  const { stats } = useCourseInsights(
    courses.map((course) => course.id),
    [],
  )
  const loved = courses
    .filter((course) => (stats[course.id]?.worthScore ?? null) !== null)
    .sort((a, b) => (stats[b.id]?.worthScore ?? 0) - (stats[a.id]?.worthScore ?? 0) || (stats[b.id]?.reviewCount ?? 0) - (stats[a.id]?.reviewCount ?? 0))
    .slice(0, 4)
  const allLoaded = courses.length > 0 && courses.every((course) => course.id in stats)
  const { goals } = useCourseInsights(
    [],
    allLoaded ? loved.map((course) => course.id) : [],
  )

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="home-heading">
        <span className="wtc-rise">
          <Coin size={104} />
        </span>
        <h1 id="home-heading" className={styles.heading}>
          <span className={`${styles.line1} wtc-rise`}>Which RIT classes are</span>
          <span className={`${styles.line2} wtc-rise wtc-d1`}>
            <span className={styles.worthIt}>
              worth it?
              <svg className={styles.squiggle} viewBox="0 0 204 16" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                <path d="M2 10 Q 22 2, 42 10 T 82 10 T 122 10 T 162 10 T 202 10" />
              </svg>
            </span>
          </span>
        </h1>
        <p className={`${styles.lede} wtc-rise wtc-d2`}>Real scores from RIT students on whether a course got them what they came for.</p>
        <div className={`${styles.search} wtc-rise wtc-d3`}>
          <SearchBar onSearch={(q) => navigate(coursesSearch({ q }))} />
        </div>
        {departments.length > 0 && (
          <div className={`${styles.filters} wtc-rise wtc-d3`}>
            <DepartmentSelect departments={departments} value="" onChange={(department) => department && navigate(coursesSearch({ department }))} />
          </div>
        )}
      </section>

      <CollegeCarousel />

      <div className={styles.lower}>
        <section aria-labelledby="loved-heading" className={styles.loved}>
          <div className={styles.sectionHead}>
            <h2 id="loved-heading">Loved by students</h2>
            <CardLegend />
            <Link to={coursesSearch()} className={styles.allLink}>
              All courses →
            </Link>
          </div>
          {catalog.state.status === 'error' ? (
            <ErrorMessage message={errorMessage(catalog.state.error)} onRetry={catalog.retry} />
          ) : !allLoaded ? (
            <div className={styles.grid} aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <CourseCardSkeleton key={i} />
              ))}
            </div>
          ) : loved.length > 0 ? (
            <div className={styles.grid}>
              {loved.map((course) => (
                <CourseCard key={course.id} course={course} stats={stats[course.id]} goals={goals[course.id]} />
              ))}
            </div>
          ) : (
            <p className={styles.none}>
              No reviews yet. <Link to={paths.writeReview()}>Be the first to review a course you took.</Link>
            </p>
          )}
        </section>

        <section aria-labelledby="advisor-heading" className={styles.advisor}>
          <h2 id="advisor-heading">Your personal course advisor</h2>
          <p className={styles.example}>Example conversation</p>
          <div className={styles.userBubble}>I’m a Software Engineering major. I know Java and Python and I want to be an ML engineer.</div>
          <div className={styles.botBubble}>
            <span>I’ll pick real RIT courses that fit you and explain why, using what students said about them. To start, students rate these highly:</span>
            {loved.slice(0, 3).map((course) => {
              const stat = stats[course.id]
              const goal = goals[course.id]?.topGoal
              const tint = tintColors(goal ? GOAL_STYLE[goal].tint : 'peach')
              return (
                <Link key={course.id} to={paths.course(course.id)} className={styles.matchRow}>
                  <span className={styles.matchChip} style={{ background: tint.bg, color: tint.fg }}>
                    {stat?.worthScore != null ? formatAverage(stat.worthScore) : '–'}
                  </span>
                  <span className={styles.matchName}>
                    {course.code} · {course.title}
                  </span>
                  {stat?.commonHours && (
                    <span className={styles.matchHours} title="Hours per week students reported">
                      <ClockIcon size={15} />
                      {hoursShort(stat.commonHours)}h/wk
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
          <Link to={paths.recommendations} className={`wtc-btn wtc-btn-orange ${styles.startButton}`}>
            Start my match <ArrowRightIcon size={16} />
          </Link>
        </section>
      </div>
    </div>
  )
}
