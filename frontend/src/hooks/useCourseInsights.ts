/**
 * What a course card needs beyond the catalog: the Community Worth Score,
 * review count, average difficulty and most reported weekly hours (from
 * GET /courses/{id}/worth-score), and the goals students took it for (from
 * the course's reviews). Search results only carry catalog fields, so these
 * load per course, in parallel, and are kept for the life of the page so
 * changing a filter or sort doesn't reload them.
 * Owner: FE1 (#20, #23).
 */
import { useEffect, useRef, useState } from 'react'
import { getWorthScore, listReviews } from '../api/reviews.ts'
import type { GoalKey, WeeklyHoursKey } from '../domain/reviewVocabulary.ts'
import { GOAL_KEYS } from '../domain/goalStyles.ts'
import { useApiClient } from '../features/auth/useApiClient.ts'
import { mostCommonHours } from '../pages/course/insights.ts'

export interface CourseStats {
  worthScore: number | null
  reviewCount: number
  averageDifficulty: number | null
  /** Most reported weekly hours, null without reviews. */
  commonHours: WeeklyHoursKey | null
}

export interface CourseGoals {
  /** The goal most reviewers named, null without reviews. */
  topGoal: GoalKey | null
  /** Every goal at least one reviewer named. */
  goals: ReadonlySet<GoalKey>
}

/** Per course id. Missing while loading, null if it failed. */
export type StatsMap = Record<string, CourseStats | null>
export type GoalsMap = Record<string, CourseGoals | null>

export function useCourseInsights(statIds: readonly string[], goalIds: readonly string[] = statIds): { stats: StatsMap; goals: GoalsMap } {
  const client = useApiClient()
  const [stats, setStats] = useState<StatsMap>({})
  const [goals, setGoals] = useState<GoalsMap>({})
  const requested = useRef({ stats: new Set<string>(), goals: new Set<string>() })
  const alive = useRef(true)
  const statKey = statIds.join(',')
  const goalKey = goalIds.join(',')

  // Requests aren't cancelled when the list changes: each id loads once and is
  // kept. Results that arrive after the page is gone are simply dropped.
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  useEffect(() => {
    for (const id of statKey ? statKey.split(',') : []) {
      if (requested.current.stats.has(id)) continue
      requested.current.stats.add(id)
      getWorthScore(client, id).then(
        (summary) =>
          alive.current &&
          setStats((current) => ({
            ...current,
            [id]: {
              worthScore: summary.reviewCount > 0 ? summary.worthScore : null,
              reviewCount: summary.reviewCount,
              averageDifficulty: summary.averageDifficulty,
              commonHours: mostCommonHours(summary.workload),
            },
          })),
        () => alive.current && setStats((current) => ({ ...current, [id]: null })),
      )
    }
    for (const id of goalKey ? goalKey.split(',') : []) {
      if (requested.current.goals.has(id)) continue
      requested.current.goals.add(id)
      listReviews(client, id, { limit: 100 }).then(
        (page) => {
          if (!alive.current) return
          const counts = new Map<GoalKey, number>()
          for (const review of page.results) for (const goal of review.goals) counts.set(goal, (counts.get(goal) ?? 0) + 1)
          let topGoal: GoalKey | null = null
          for (const key of GOAL_KEYS) if ((counts.get(key) ?? 0) > 0 && (topGoal === null || counts.get(key)! > counts.get(topGoal)!)) topGoal = key
          setGoals((current) => ({ ...current, [id]: { topGoal, goals: new Set(counts.keys()) } }))
        },
        () => alive.current && setGoals((current) => ({ ...current, [id]: null })),
      )
    }
  }, [client, statKey, goalKey])

  return { stats, goals }
}
