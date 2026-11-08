/**
 * Course-page numbers worked out from the loaded reviews: how the Worth
 * Scores spread, why students took the course, and the skills they named.
 * The Worth Score itself always comes from the API, never from here.
 * Owner: FE1 (#21, #22).
 */
import type { Review } from '../../api/reviews.ts'
import { GOALS, WEEKLY_HOURS, type GoalKey, type WeeklyHoursKey } from '../../domain/reviewVocabulary.ts'

export interface Share {
  label: string
  count: number
  /** 0 to 100. */
  pct: number
}

const pct = (count: number, total: number) => (total > 0 ? Math.round((count / total) * 100) : 0)

/** Share of reviews at each Worth Score, 5 first. */
export function worthDistribution(reviews: readonly Review[]): Array<Share & { score: number }> {
  return [5, 4, 3, 2, 1].map((score) => {
    const count = reviews.filter((review) => review.worthScore === score).length
    return { score, label: String(score), count, pct: pct(count, reviews.length) }
  })
}

/** Share of reviews naming each goal (a review can name several), most common first. */
export function goalShares(reviews: readonly Review[]): Array<Share & { key: GoalKey }> {
  return GOALS.map(({ key, label }) => {
    const count = reviews.filter((review) => review.goals.includes(key)).length
    return { key, label, count, pct: pct(count, reviews.length) }
  })
    .filter((share) => share.count > 0)
    .sort((a, b) => b.count - a.count)
}

/** Skills students named, merged case-insensitively, most mentioned first. */
export function topSkills(reviews: readonly Review[], limit = 10): Array<{ name: string; count: number }> {
  const counts = new Map<string, { name: string; count: number }>()
  for (const review of reviews) {
    const seen = new Set<string>()
    for (const raw of review.skillsGained) {
      const name = raw.trim()
      const key = name.toLowerCase()
      if (!name || seen.has(key)) continue
      seen.add(key)
      const entry = counts.get(key)
      if (entry) entry.count += 1
      else counts.set(key, { name, count: 1 })
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, limit)
}

/** The weekly-hours range most reviewers picked, or null with no reviews. */
export function mostCommonHours(workload: Record<WeeklyHoursKey, number>): WeeklyHoursKey | null {
  let best: WeeklyHoursKey | null = null
  for (const { key } of WEEKLY_HOURS) {
    if ((workload[key] ?? 0) > 0 && (best === null || workload[key] > workload[best])) best = key
  }
  return best
}

/** "Posted Dec 2025" from an ISO date. */
export function postedLabel(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Posted recently'
  return `Posted ${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
}
