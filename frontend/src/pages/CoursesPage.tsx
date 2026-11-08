import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { searchCourses } from '../api/courses.ts'
import CourseCard, { CourseCardSkeleton } from '../components/ui/CourseCard.tsx'
import { CloseIcon, SearchIcon, SparkIcon } from '../components/ui/icons.tsx'
import SearchBar from '../components/ui/SearchBar.tsx'
import StateMessage, { ErrorMessage } from '../components/ui/StateMessage.tsx'
import { COLLEGES, collegeByKey, collegeForName } from '../domain/colleges.ts'
import { errorMessage, useApiQuery } from '../hooks/useApiQuery.ts'
import { useCourseStats } from '../hooks/useCourseStats.ts'
import { coursesSearch } from '../routes/discoveryPaths.ts'
import { paths } from '../routes/paths.ts'
import styles from './CoursesPage.module.css'

const PAGE_SIZE = 12
/** The API caps one page at 100; the college filter runs on that page. */
const FETCH_LIMIT = 100
const POPULAR = ['SWEN-261', 'Artificial intelligence', 'Writing', 'Security', 'Game design']

/**
 * /courses?q=&college=: search results with a college filter. The search
 * text goes to GET /courses; the API has no college filter yet, so that one
 * is applied to the returned courses. Owner: FE1 (#20).
 */
export default function CoursesPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const q = params.get('q') ?? ''
  const collegeKey = params.get('college')
  const college = collegeByKey(collegeKey)
  const [shown, setShown] = useState(PAGE_SIZE)

  const search = useApiQuery(`courses:${q}`, (client, signal) => searchCourses(client, { q: q || undefined, limit: FETCH_LIMIT }, signal))
  const all = search.state.status === 'success' ? search.state.data.results : []
  const matches = college ? all.filter((course) => collegeForName(course.college)?.key === college.key) : all
  const visible = matches.slice(0, shown)
  const stats = useCourseStats(visible.map((course) => course.id))

  const go = (next: { q?: string; college?: string | null }) => {
    setShown(PAGE_SIZE)
    navigate(coursesSearch({ q: next.q ?? q, college: (next.college === undefined ? collegeKey : next.college) ?? undefined }))
  }

  const heading = q ? `Results for “${q}”` : college ? `${college.name} courses` : 'All courses'

  return (
    <div className={styles.page}>
      <section className={`${styles.top} wtc-rise`}>
        <h1 className={styles.heading}>{heading}</h1>
        {/* key resets the box when the URL's query changes, e.g. after Back. */}
        <SearchBar key={q} initialValue={q} onSearch={(text) => go({ q: text })} />
      </section>

      <section className="wtc-rise wtc-d1" aria-labelledby="college-filter">
        <h2 id="college-filter" className={styles.label}>
          College
        </h2>
        <div className={styles.chips} role="group" aria-labelledby="college-filter">
          <button type="button" className={styles.chip} aria-pressed={!college} onClick={() => go({ college: null })}>
            All colleges
          </button>
          {COLLEGES.map((item) => (
            <button
              key={item.key}
              type="button"
              className={styles.chip}
              aria-pressed={college?.key === item.key}
              style={college?.key === item.key ? { background: `var(--wtc-${item.tint})` } : undefined}
              onClick={() => go({ college: college?.key === item.key ? null : item.key })}
            >
              <img src={item.mark} alt="" className={styles.chipMark} />
              {item.name}
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="results-heading" aria-busy={search.state.status === 'loading'} className={styles.results}>
        <h2 id="results-heading" className="wtc-sr">
          Results
        </h2>
        {search.state.status === 'loading' && (
          <>
            <p className={styles.count} role="status">
              Finding courses…
            </p>
            <div className={styles.grid}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <CourseCardSkeleton key={i} />
              ))}
            </div>
          </>
        )}

        {search.state.status === 'error' && <ErrorMessage message={errorMessage(search.state.error)} onRetry={search.retry} />}

        {search.state.status === 'success' && matches.length === 0 && (
          <StateMessage
            tint="teal"
            art={<SearchIcon size={36} />}
            title={q ? `No courses match “${q}”` : `No ${college?.name ?? ''} courses yet`}
            actions={
              <>
                {(q || college) && (
                  <Link to={coursesSearch()} className="wtc-btn wtc-btn-orange">
                    Clear search
                  </Link>
                )}
                <Link to={paths.recommendations} className="wtc-btn wtc-btn-white">
                  <SparkIcon size={16} /> Get AI matches
                </Link>
              </>
            }
          >
            <p>Try a course code like SWEN-261, fewer words, or another college.</p>
            <div className={styles.popular}>
              {POPULAR.map((term) => (
                <Link key={term} to={coursesSearch({ q: term })} className={styles.popularChip}>
                  {term}
                </Link>
              ))}
            </div>
          </StateMessage>
        )}

        {search.state.status === 'success' && matches.length > 0 && (
          <>
            <div className={styles.countRow}>
              <p className={styles.count} role="status">
                {matches.length === 1 ? '1 course' : `${matches.length} courses`}
                {college && ` in ${college.name}`}
              </p>
              {college && (
                <button type="button" className={styles.clear} onClick={() => go({ college: null })}>
                  {college.name} <CloseIcon size={11} />
                  <span className="wtc-sr">Remove college filter</span>
                </button>
              )}
            </div>
            <div className={styles.grid}>
              {visible.map((course) => (
                <CourseCard key={course.id} course={course} stats={stats[course.id]} />
              ))}
            </div>
            {matches.length > shown && (
              <button type="button" className={`wtc-btn wtc-btn-white ${styles.moreButton}`} onClick={() => setShown((n) => n + PAGE_SIZE)}>
                Show more courses
              </button>
            )}
          </>
        )}
      </section>
    </div>
  )
}
