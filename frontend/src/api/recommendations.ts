/**
 * POST /recommendations, per BE2's contract. Owner: FE2 (#31).
 *
 * Items are checked one at a time, so one malformed item from the AI pipeline
 * is dropped (and counted) instead of failing the whole page (project.mdc:
 * "Do not trust AI-generated responses without validation").
 */
import { z } from 'zod'
import type { ApiClient } from './client.ts'
import type { ProfileRequest } from './profile.ts'
import { toMatchLevel, type MatchLevel } from '../domain/reviewVocabulary.ts'

export interface RecommendationRequest {
  /** Omit to use the student's saved profile (BE2 answers profile_required if there's none). */
  profile?: ProfileRequest
  /** Optional free-text request, up to 500 characters. */
  query?: string
}

export interface Recommendation {
  courseCode: string
  title: string
  matchLevel: MatchLevel
  /** How the course connects to the student's goals (AI-written). */
  why: string
  /** Skills the student could build (AI-written). */
  skills: string[]
  /** What past reviewers reported; empty when the course has no reviews. */
  studentInsights: string[]
  /** From the database, not the AI. Null when there are no reviews. */
  worthScore: number | null
  reviewCount: number
  difficultyAvg: number | null
  workloadSummary: string | null
  /** Caveats, always ending with the prerequisites-not-verified note. */
  limitations: string[]
}

export interface RecommendationResult {
  items: Recommendation[]
  /** Items dropped because they were malformed or repeated. */
  droppedCount: number
}

const strings = z
  .array(z.string())
  .nullish()
  .transform((list) => list ?? [])

const itemSchema = z.object({
  course_code: z.string().min(1),
  title: z.string(),
  match_level: z.string(),
  why: z.string(),
  skills: strings,
  student_insights: strings,
  difficulty_avg: z.number().nullish(),
  workload_summary: z.string().nullish(),
  worth_score: z.number().nullish(),
  review_count: z.number().int().nonnegative().nullish(),
  limitations: strings,
})

export function parseRecommendation(value: unknown): Recommendation | null {
  const parsed = itemSchema.safeParse(value)
  if (!parsed.success) return null
  const item = parsed.data
  const matchLevel = toMatchLevel(item.match_level)
  if (!matchLevel || item.why.trim() === '') return null
  return {
    courseCode: item.course_code,
    title: item.title,
    matchLevel,
    why: item.why.trim(),
    skills: item.skills,
    studentInsights: item.student_insights,
    worthScore: item.worth_score ?? null,
    reviewCount: item.review_count ?? 0,
    difficultyAvg: item.difficulty_avg ?? null,
    workloadSummary: item.workload_summary ?? null,
    limitations: item.limitations,
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
      if (!item || seen.has(item.courseCode)) {
        droppedCount += 1
        continue
      }
      seen.add(item.courseCode)
      items.push(item)
    }
    return { items, droppedCount }
  })

/** BE2 says typical latency is a few seconds; this allows a minute. */
export const RECOMMENDATION_TIMEOUT_MS = 60_000

/** Fails with profile_required (400), rate_limited (429), recommendation_failed (502), or gemini_not_configured (503). */
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
