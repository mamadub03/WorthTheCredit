/**
 * Worth Score, review count and difficulty for a list of courses. Search
 * results only carry course info (BE1's CourseSummary), so each card's numbers
 * come from GET /courses/{id}, fetched in parallel as the list appears.
 * Owner: FE1 (#20, #23).
 */
import { useEffect, useState } from 'react'
import { getCourse } from '../api/courses.ts'
import type { CourseStats } from '../components/ui/CourseCard.tsx'
import { useApiClient } from '../features/auth/useApiClient.ts'

/** Per course id: the stats, null if they failed to load, missing while loading. */
export type CourseStatsMap = Record<string, CourseStats | null>

export function useCourseStats(courseIds: readonly string[]): CourseStatsMap {
  const client = useApiClient()
  const [stats, setStats] = useState<CourseStatsMap>({})
  const key = courseIds.join(',')

  useEffect(() => {
    if (!key) return
    const controller = new AbortController()
    for (const id of key.split(',')) {
      getCourse(client, id, controller.signal).then(
        (course) => {
          if (controller.signal.aborted) return
          const next: CourseStats = { worthScore: course.worthScore, reviewCount: course.reviewCount, averageDifficulty: course.averageDifficulty }
          setStats((current) => ({ ...current, [id]: next }))
        },
        () => {
          if (!controller.signal.aborted) setStats((current) => ({ ...current, [id]: null }))
        },
      )
    }
    return () => controller.abort()
  }, [client, key])

  return stats
}
