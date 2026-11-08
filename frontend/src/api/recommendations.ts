/**
 * POST /recommendations, per the contract on main
 * (backend/app/schemas/recommendation.py, issue #10). VITE_API_MOCKS can send
 * it to the mock API instead, for offline work (issue #31). Owner: FE2.
 *
 * Items are checked one at a time, so one malformed item from the AI pipeline
 * is dropped (and counted) instead of failing the page (project.mdc: "Do not
 * trust AI-generated responses without validation").
 */
import { z } from 'zod'
import type { ApiClient } from './client.ts'
import { courseSummarySchema, type CourseSummary } from './courses.ts'
import { toMatchLevel, type MatchLevel } from '../domain/reviewVocabulary.ts'

/** RecommendationRequest. The API rejects other keys and needs at least one preference. */
export interface RecommendationRequest {
  major: string | null
  interests: string[]
  skills: string[]
  career_goals: string | null
  academic_goals: string | null
}

export interface Recommendation {
  course: CourseSummary
  matchLevel: MatchLevel
  /** Why it fits the student (written by Gemini). */
  explanation: string
  /** From the database, never from Gemini. Null while the course has no reviews. */
  worthScore: number | null
  reviewCount: number
}

export interface RecommendationResult {
  items: Recommendation[]
  /** Items dropped because they were malformed or repeated. */
  droppedCount: number
}

const itemSchema = z.object({
  course: courseSummarySchema,
  match_level: z.string(),
  explanation: z.string(),
  community_worth_score: z.number().nullish(),
  review_count: z.number().int().nonnegative().nullish(),
})

export function parseRecommendation(value: unknown): Recommendation | null {
  const parsed = itemSchema.safeParse(value)
  if (!parsed.success) return null
  const item = parsed.data
  const matchLevel = toMatchLevel(item.match_level)
  const explanation = item.explanation.trim()
  if (!matchLevel || explanation === '') return null
  return {
    course: item.course,
    matchLevel,
    explanation,
    worthScore: item.community_worth_score ?? null,
    reviewCount: item.review_count ?? 0,
  }
}

export const recommendationsSchema = z
  .object({ recommendations: z.array(z.unknown()) })
  .transform(({ recommendations }): RecommendationResult => {
    const items: Recommendation[] = []
    const seen = new Set<string>()
    let droppedCount = 0
    for (const raw of recommendations) {
      const item = parseRecommendation(raw)
      if (!item || seen.has(item.course.id)) {
        droppedCount += 1
        continue
      }
      seen.add(item.course.id)
      items.push(item)
    }
    return { items, droppedCount }
  })

/** A Gemini call can take several seconds; this allows a minute. */
export const RECOMMENDATION_TIMEOUT_MS = 60_000

/** Needs a signed-in student. 422 means the request had no preference at all. */
export function getRecommendations(
  client: ApiClient,
  request: RecommendationRequest,
  signal?: AbortSignal,
): Promise<RecommendationResult> {
  return client.request('/recommendations', {
    method: 'POST',
    body: request,
    auth: true,
    schema: recommendationsSchema,
    signal,
    timeoutMs: RECOMMENDATION_TIMEOUT_MS,
  })
}
