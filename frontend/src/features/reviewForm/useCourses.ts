/**
 * Course lookups for the review form's picker, against BE1's live API.
 * Owner: FE2 (#27).
 */
import { useEffect, useState } from 'react'
import { getCourse, searchCourses, type CourseDetail, type CourseSummary } from '../../api/courses.ts'
import { normalizeCourseCode } from '../../routes/paths.ts'
import { useApiClient } from '../auth/useApiClient.ts'

export type LoadStatus = 'idle' | 'loading' | 'done' | 'error'

const SEARCH_DELAY_MS = 250
const MIN_SEARCH_LENGTH = 2

/** Courses matching what the student typed, a moment after they stop typing. */
export function useCourseSearch(text: string): { results: CourseSummary[]; status: LoadStatus } {
  const client = useApiClient()
  const query = normalizeCourseCode(text)
  const [state, setState] = useState<{ query: string; results: CourseSummary[]; status: LoadStatus }>({
    query: '',
    results: [],
    status: 'idle',
  })

  useEffect(() => {
    if (query.length < MIN_SEARCH_LENGTH) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setState((current) => ({ ...current, query, status: 'loading' }))
      searchCourses(client, { q: query, limit: 8 }, controller.signal).then(
        (page) => setState({ query, results: page.results, status: 'done' }),
        () => {
          if (!controller.signal.aborted) setState({ query, results: [], status: 'error' })
        },
      )
    }, SEARCH_DELAY_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [client, query])

  if (query.length < MIN_SEARCH_LENGTH) return { results: [], status: 'idle' }
  return state.query === query ? state : { results: state.results, status: 'loading' }
}

/** One course by id, for a picker that opens with a course already chosen. */
export function useCourse(courseId: string | null): { course: CourseDetail | null; status: LoadStatus } {
  const client = useApiClient()
  const [state, setState] = useState<{ id: string | null; course: CourseDetail | null; status: LoadStatus }>({
    id: null,
    course: null,
    status: 'idle',
  })

  useEffect(() => {
    if (!courseId) return
    const controller = new AbortController()
    getCourse(client, courseId, controller.signal).then(
      (course) => setState({ id: courseId, course, status: 'done' }),
      () => {
        if (!controller.signal.aborted) setState({ id: courseId, course: null, status: 'error' })
      },
    )
    return () => controller.abort()
  }, [client, courseId])

  if (!courseId) return { course: null, status: 'idle' }
  return state.id === courseId ? state : { course: null, status: 'loading' }
}
