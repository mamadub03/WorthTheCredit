import { Link, useNavigate } from 'react-router'
import { searchCourses } from '../api/courses.ts'
import Coin from '../components/ui/Coin.tsx'
import CourseCard, { CourseCardSkeleton } from '../components/ui/CourseCard.tsx'
import { ArrowRightIcon, SparkIcon } from '../components/ui/icons.tsx'
import SearchBar from '../components/ui/SearchBar.tsx'
import { ErrorMessage } from '../components/ui/StateMessage.tsx'
import { errorMessage, useApiQuery } from '../hooks/useApiQuery.ts'
import { useCourseStats } from '../hooks/useCourseStats.ts'
import { coursesSearch } from '../routes/discoveryPaths.ts'
import { paths } from '../routes/paths.ts'
import CollegeCarousel from './home/CollegeCarousel.tsx'
import styles from './HomePage.module.css'

/** How many courses the "Loved by students" list looks through. */
const SAMPLE_SIZE = 12

/**
 * Home: the big question and the search bar, a way into AI matches (user
 * story 1), the spinning wall of colleges, and the best-reviewed courses.
 * Owner: FE1 (#20).
 */
export default function HomePage() {
  const navigate = useNavigate()
  const sample = useApiQuery('home-sample', (client, signal) => searchCourses(client, { limit: SAMPLE_SIZE }, signal))
  const courses = sample.state.status === 'success' ? sample.state.data.results : []
  const stats = useCourseStats(courses.map((course) => course.id))

  const allLoaded = courses.length > 0 && courses.every((course) => course.id in stats)
  const loved = courses
    .filter((course) => (stats[course.id]?.worthScore ?? null) !== null)
    .sort((a, b) => (stats[b.id]?.worthScore ?? 0) - (stats[a.id]?.worthScore ?? 0))
    .slice(0, 4)

  return (
    <div className={styles.page}>
      <section className={`${styles.hero} wtc-rise`} aria-labelledby="home-heading">
        <Coin size={112} />
        <h1 id="home-heading" className={styles.heading}>
          Which RIT classes are
          <span className={styles.worthIt}>
            worth it?
            <svg className={styles.squiggle} viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden="true" focusable="false">
              <path d="M4 14 C 30 2, 50 22, 76 12 S 124 4, 150 13 S 200 22, 226 11 S 276 4, 296 12" />
            </svg>
          </span>
        </h1>
        <p className={styles.lede}>Real reviews from RIT students on what each course was actually worth, and AI matches for your goals.</p>
        <div className={styles.search}>
          <SearchBar size="hero" onSearch={(q) => navigate(coursesSearch({ q }))} />
        </div>
        <Link to={paths.recommendations} className={styles.aiLink}>
          <SparkIcon size={18} />
          Not sure what to search? Get AI course matches
          <ArrowRightIcon size={16} />
        </Link>
      </section>

      <CollegeCarousel />

      <section className={`${styles.loved} wtc-rise wtc-d2`} aria-labelledby="loved-heading">
        <div className={styles.sectionHead}>
          <h2 id="loved-heading">Loved by students</h2>
          <Link to={coursesSearch()} className={styles.more}>
            See all courses <ArrowRightIcon size={15} />
          </Link>
        </div>
        {sample.state.status === 'error' ? (
          <ErrorMessage message={errorMessage(sample.state.error)} onRetry={sample.retry} />
        ) : !allLoaded ? (
          <div className={styles.grid} aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        ) : loved.length > 0 ? (
          <div className={styles.grid}>
            {loved.map((course) => (
              <CourseCard key={course.id} course={course} stats={stats[course.id]} />
            ))}
          </div>
        ) : (
          <p className={styles.none}>
            No reviews yet. <Link to={paths.writeReview()}>Be the first to review a course you took.</Link>
          </p>
        )}
      </section>

      <section className={`${styles.match} wtc-rise wtc-d3`} aria-labelledby="match-heading">
        <span className={styles.matchIcon} aria-hidden="true">
          <SparkIcon size={30} />
        </span>
        <div className={styles.matchText}>
          <h2 id="match-heading">Tell us your goals, get matched</h2>
          <p>Share your major, interests and what you want out of a class. Our AI picks real RIT courses and explains why each one fits, using what students said about them.</p>
        </div>
        <Link to={paths.recommendations} className="wtc-btn wtc-btn-dark">
          Get my matches <ArrowRightIcon size={16} />
        </Link>
      </section>
    </div>
  )
}
