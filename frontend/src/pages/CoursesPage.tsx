import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { searchCourses, type CourseSummary } from '../api/courses.ts'
import CourseCard, { CardLegend, CourseCardSkeleton } from '../components/ui/CourseCard.tsx'
import { SearchIcon, SparkIcon } from '../components/ui/icons.tsx'
import SearchBar, { DepartmentSelect } from '../components/ui/SearchBar.tsx'
import StateMessage, { ErrorMessage } from '../components/ui/StateMessage.tsx'
import { COLLEGES, collegeByKey, collegeForName } from '../domain/colleges.ts'
import { GOAL_KEYS, GOAL_STYLE } from '../domain/goalStyles.ts'
import { WEEKLY_HOURS, type GoalKey } from '../domain/reviewVocabulary.ts'
import { errorMessage, useApiQuery } from '../hooks/useApiQuery.ts'
import { useCourseInsights, type StatsMap } from '../hooks/useCourseInsights.ts'
import { coursesSearch } from '../routes/discoveryPaths.ts'
import { paths } from '../routes/paths.ts'
import styles from './CoursesPage.module.css'

const PAGE_SIZE = 12
/** The API caps one page at 100, which covers the demo catalog. */
const FETCH_LIMIT = 100
const POPULAR = ['SWEN-261', 'Artificial intelligence', 'Writing', 'Security', 'Game design']

const SORTS = {
  worth: 'Highest Worth Score',
  reviews: 'Most reviewed',
  workload: 'Lightest workload',
  easiest: 'Easiest concepts',
} as const
type SortKey = keyof typeof SORTS

const HOURS_ORDER = WEEKLY_HOURS.map((hours) => hours.key as string)

function sortCourses(courses: CourseSummary[], stats: StatsMap, sort: SortKey): CourseSummary[] {
  // Unreviewed courses always go last, in catalog order.
  const value = (course: CourseSummary): number | null => {
    const stat = stats[course.id]
    if (!stat || stat.reviewCount === 0) return null
    if (sort === 'worth') return -(stat.worthScore ?? 0)
    if (sort === 'reviews') return -stat.reviewCount
    if (sort === 'workload') return stat.commonHours ? HOURS_ORDER.indexOf(stat.commonHours) : null
    return stat.averageDifficulty
  }
  return [...courses].sort((a, b) => {
    const va = value(a)
    const vb = value(b)
    if (va === null || vb === null) return va === null ? (vb === null ? 0 : 1) : -1
    return va - vb
  })
}

/**
 * /courses, built from the Carousel-Courses board: search with a Department
 * filter, college chips, "What students wanted" goal chips, a sort, and the
 * course cards. The API filters by text and department; college, goals and
 * sorting run on the returned page. Owner: FE1 (#20).
 */
export default function CoursesPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const q = params.get('q') ?? ''
  const department = params.get('department') ?? ''
  const college = collegeByKey(params.get('college'))
  const [shown, setShown] = useState(PAGE_SIZE)
  const [sort, setSort] = useState<SortKey>('worth')
  const [wanted, setWanted] = useState<ReadonlySet<GoalKey>>(new Set())

  const search = useApiQuery(`courses:${q}:${department}`, (client, signal) =>
    searchCourses(client, { q: q || undefined, department: department || undefined, limit: FETCH_LIMIT }, signal),
  )
  const catalog = useApiQuery('courses:departments', (client, signal) => searchCourses(client, { limit: FETCH_LIMIT }, signal))
  const departments =
    catalog.state.status === 'success'
      ? [...new Set(catalog.state.data.results.map((course) => course.department).filter((d): d is string => !!d))].sort()
      : []

  const results = search.state.status === 'success' ? search.state.data.results : []
  const inCollege = college ? results.filter((course) => collegeForName(course.college)?.key === college.key) : results
  const ids = inCollege.map((course) => course.id)
  // Every course's numbers, so the sort is right across the whole list.
  const { stats } = useCourseInsights(
    ids,
    [],
  )
  const sorted = sortCourses(inCollege, stats, sort)
  // Goal chips need every course's goals; otherwise only the cards on screen
  // (in sorted order) need their "Top reason".
  const { goals } = useCourseInsights(
    [],
    wanted.size > 0 ? ids : sorted.slice(0, shown).map((course) => course.id),
  )
  const statsReady = inCollege.every((course) => course.id in stats)
  const goalsReady = wanted.size === 0 || inCollege.every((course) => course.id in goals)
  const matches = wanted.size > 0 ? sorted.filter((course) => [...wanted].some((goal) => goals[course.id]?.goals.has(goal))) : sorted
  const visible = matches.slice(0, shown)
  const ready = search.state.status === 'success' && statsReady && goalsReady

  const go = (next: { q?: string; college?: string | null; department?: string }) => {
    setShown(PAGE_SIZE)
    navigate(
      coursesSearch({
        q: next.q ?? q,
        college: (next.college === undefined ? college?.key : next.college) ?? undefined,
        department: next.department ?? department,
      }),
    )
  }
  const toggleGoal = (goal: GoalKey) => {
    setShown(PAGE_SIZE)
    setWanted((current) => {
      const next = new Set(current)
      if (next.has(goal)) next.delete(goal)
      else next.add(goal)
      return next
    })
  }

  const where = [college?.name, department].filter(Boolean).join(' · ')
  const heading = q ? `${matches.length} ${matches.length === 1 ? 'result' : 'results'} for “${q}”` : `${matches.length} ${matches.length === 1 ? 'course' : 'courses'}${where ? ` in ${where}` : ''}`

  return (
    <div className={styles.page}>
      <section className={styles.top}>
        <h1 className={`${styles.title} wtc-rise`}>Browse RIT courses</h1>
        <div className={`${styles.searchRow} wtc-rise wtc-d1`}>
          {/* key resets the box when the URL's query changes, e.g. after Back. */}
          <SearchBar key={q} initialValue={q} onSearch={(text) => go({ q: text })} />
        </div>
        {departments.length > 0 && (
          <div className={`${styles.filters} wtc-rise wtc-d2`}>
            <DepartmentSelect departments={departments} value={department} onChange={(value) => go({ department: value })} />
          </div>
        )}
      </section>

      <section aria-labelledby="college-filter" className={`${styles.chipsBlock} wtc-rise wtc-d3`}>
        <h2 id="college-filter" className={styles.label}>
          College
        </h2>
        <div className={styles.chips} role="group" aria-label="Filter by college">
          {COLLEGES.map((item) => {
            const on = college?.key === item.key
            return (
              <button
                key={item.key}
                type="button"
                className={styles.chip}
                aria-pressed={on}
                style={on ? { background: `var(--wtc-${item.tint})`, borderColor: 'var(--wtc-ink)' } : undefined}
                onClick={() => go({ college: on ? null : item.key })}
              >
                <img src={item.mark} alt="" className={styles.chipMark} />
                {item.name}
              </button>
            )
          })}
        </div>
        <div className={styles.goals} role="group" aria-label="What students wanted">
          {GOAL_KEYS.map((goal) => {
            const on = wanted.has(goal)
            return (
              <button
                key={goal}
                type="button"
                className={styles.goal}
                aria-pressed={on}
                style={on ? { background: `var(--wtc-${GOAL_STYLE[goal].tint})`, borderColor: 'var(--wtc-ink)' } : undefined}
                onClick={() => toggleGoal(goal)}
              >
                {GOAL_STYLE[goal].short}
              </button>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="results-heading" aria-busy={!ready} className={styles.results}>
        {search.state.status === 'error' ? (
          <ErrorMessage message={errorMessage(search.state.error)} onRetry={search.retry} />
        ) : !ready ? (
          <>
            <div className={styles.resultsHead}>
              <h2 id="results-heading" className={styles.resultsTitle} role="status">
                Finding courses…
              </h2>
            </div>
            <div className={styles.grid}>
              {Array.from({ length: 8 }, (_, i) => (
                <CourseCardSkeleton key={i} />
              ))}
            </div>
          </>
        ) : matches.length === 0 ? (
          <>
            <h2 id="results-heading" className="wtc-sr">
              No results
            </h2>
            <StateMessage
              tint="teal"
              art={<SearchIcon size={36} />}
              title={q ? `No courses match “${q}”` : 'No courses match these filters'}
              actions={
                <>
                  <Link to={coursesSearch()} className="wtc-btn wtc-btn-orange" onClick={() => setWanted(new Set())}>
                    Clear search
                  </Link>
                  <Link to={paths.recommendations} className="wtc-btn wtc-btn-white">
                    <SparkIcon size={16} /> Get AI matches
                  </Link>
                </>
              }
            >
              <p>Try a course code like SWEN-261, fewer words, or another filter.</p>
              <div className={styles.popular}>
                {POPULAR.map((term) => (
                  <Link key={term} to={coursesSearch({ q: term })} className={styles.popularChip}>
                    {term}
                  </Link>
                ))}
              </div>
            </StateMessage>
          </>
        ) : (
          <>
            <div className={styles.resultsHead}>
              <div className={styles.resultsText}>
                <h2 id="results-heading" className={styles.resultsTitle} role="status">
                  {heading}
                </h2>
                <CardLegend />
              </div>
              <label className={styles.sort}>
                Sort
                <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
                  {(Object.keys(SORTS) as SortKey[]).map((key) => (
                    <option key={key} value={key}>
                      {SORTS[key]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className={styles.grid}>
              {visible.map((course) => (
                <CourseCard key={course.id} course={course} stats={stats[course.id]} goals={goals[course.id]} />
              ))}
            </div>
            {matches.length > shown && (
              <button type="button" className={`wtc-btn wtc-btn-white ${styles.moreButton}`} onClick={() => setShown((n) => n + PAGE_SIZE)}>
                Load {Math.min(PAGE_SIZE, matches.length - shown)} more
              </button>
            )}
          </>
        )}
      </section>
    </div>
  )
}
