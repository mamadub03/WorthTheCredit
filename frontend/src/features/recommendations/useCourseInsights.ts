/**
 * What past students reported about a course, for a recommendation card:
 * concept difficulty, the most common weekly hours, and the skills they
 * gained. All of it comes from reviews in the database, never from Gemini.
 * Owner: FE2 (#30).
 */
import { useEffect, useState } from 'react'
import { getWorthScore, listReviews, type Review, type WorthScore } from '../../api/reviews.ts'
import { WEEKLY_HOURS, type WeeklyHoursKey } from '../../domain/reviewVocabulary.ts'
import { useApiClient } from '../auth/useApiClient.ts'

export interface CourseInsights {
  averageDifficulty: number | null
  mostCommonHours: WeeklyHoursKey | null
  /** The skills reviewers mention most, most common first. */
  topSkills: string[]
}

/** Pure, so it can be tested without the network. */
export function summarizeInsights(summary: WorthScore, reviews: readonly Review[], maxSkills = 4): CourseInsights {
  let mostCommonHours: WeeklyHoursKey | null = null
  for (const { key } of WEEKLY_HOURS) {
    const count = summary.workload[key]
    if (count > 0 && (mostCommonHours === null || count > summary.workload[mostCommonHours])) mostCommonHours = key
  }

  const counts = new Map<string, { skill: string; count: number }>()
  for (const review of reviews) {
    for (const skill of review.skillsGained) {
      const key = skill.toLowerCase()
      const entry = counts.get(key)
      if (entry) entry.count += 1
      else counts.set(key, { skill, count: 1 })
    }
  }
  const topSkills = [...counts.values()]
    .sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill))
    .slice(0, maxSkills)
    .map((entry) => entry.skill)

  return { averageDifficulty: summary.averageDifficulty, mostCommonHours, topSkills }
}

export function useCourseInsights(courseId: string, reviewCount: number) {
  const client = useApiClient()
  const [state, setState] = useState<{ courseId: string; insights: CourseInsights | null; failed: boolean }>({
    courseId: '',
    insights: null,
    failed: false,
  })
  const hasReviews = reviewCount > 0

  useEffect(() => {
    if (!hasReviews) return
    const controller = new AbortController()
    Promise.all([getWorthScore(client, courseId, controller.signal), listReviews(client, courseId, { limit: 50 }, controller.signal)]).then(
      ([summary, page]) => setState({ courseId, insights: summarizeInsights(summary, page.results), failed: false }),
      () => {
        if (!controller.signal.aborted) setState({ courseId, insights: null, failed: true })
      },
    )
    return () => controller.abort()
  }, [client, courseId, hasReviews])

  if (!hasReviews) return { insights: null, loading: false, failed: false }
  const current = state.courseId === courseId
  return { insights: current ? state.insights : null, loading: !current, failed: current && state.failed }
}
