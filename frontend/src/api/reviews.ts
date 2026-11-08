/**
 * Review calls and schemas, per the contracts on main
 * (backend/app/schemas/review.py, issue #10). VITE_API_MOCKS can send them to
 * the mock API instead, for offline work.
 *
 * Shared module: FE2 wrote create and worth-score (#28, #30); FE1 adds the
 * review list here (#22, #23), reusing `reviewSchema`.
 */
import { z } from 'zod'
import type { ApiClient } from './client.ts'
import { isGoalKey, WEEKLY_HOURS, type GoalKey, type WeeklyHoursKey } from '../domain/reviewVocabulary.ts'

const score = z.number().int().min(1).max(5)

/** One review as other students see it (ReviewPublic). No reviewer identity. */
export const reviewSchema = z
  .object({
    id: z.string(),
    course_id: z.string(),
    goals: z.array(z.string()),
    worth_score: score,
    concept_difficulty: score,
    weekly_hours_range: z.string(),
    skills_gained: z.array(z.string()).nullish(),
    feedback: z.string().nullish(),
    instructor_name: z.string().nullish(),
    semester: z.string().nullish(),
    created_at: z.string(),
  })
  .transform((review) => ({
    id: review.id,
    courseId: review.course_id,
    goals: review.goals.filter(isGoalKey),
    worthScore: review.worth_score,
    conceptDifficulty: review.concept_difficulty,
    weeklyHoursRange: review.weekly_hours_range,
    skillsGained: review.skills_gained ?? [],
    feedback: review.feedback ?? null,
    instructorName: review.instructor_name ?? null,
    semester: review.semester ?? null,
    createdAt: review.created_at,
  }))

export type Review = z.output<typeof reviewSchema>

/** The body POST /courses/{course_id}/reviews takes (ReviewCreate). The API rejects any other key. */
export interface ReviewCreateRequest {
  goals: GoalKey[]
  worth_score: number
  concept_difficulty: number
  weekly_hours_range: WeeklyHoursKey
  skills_gained: string[]
  feedback: string | null
  instructor_name: string | null
  semester: string | null
}

/**
 * Needs a signed-in student with a verified email.
 * Status codes: 401 signed out, 403 email not verified, 404 unknown course,
 * 409 already reviewed this course, 422 a field failed validation.
 */
export function createReview(
  client: ApiClient,
  courseId: string,
  request: ReviewCreateRequest,
  signal?: AbortSignal,
): Promise<Review> {
  return client.request(`/courses/${encodeURIComponent(courseId)}/reviews`, {
    method: 'POST',
    body: request,
    auth: true,
    schema: reviewSchema,
    signal,
  })
}

/** One page of a course's reviews (ReviewListResponse), newest first. */
export const reviewPageSchema = z.object({
  results: z.array(reviewSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int(),
  offset: z.number().int(),
})

export type ReviewPage = z.output<typeof reviewPageSchema>

/** Public. FE1's review list (#22) and FE2's recommendation cards (#30) both read it. */
export function listReviews(
  client: ApiClient,
  courseId: string,
  page: { limit?: number; offset?: number } = {},
  signal?: AbortSignal,
): Promise<ReviewPage> {
  return client.request(`/courses/${encodeURIComponent(courseId)}/reviews`, {
    query: { limit: page.limit, offset: page.offset },
    schema: reviewPageSchema,
    signal,
  })
}

/** A course's review aggregates (WorthScoreSummary). Difficulty and workload never feed the Worth Score. */
export const worthScoreSchema = z
  .object({
    course_id: z.string(),
    community_worth_score: z.number().nullish(),
    review_count: z.number().int().nonnegative(),
    average_concept_difficulty: z.number().nullish(),
    workload: z.record(z.string(), z.number().int().nonnegative()).nullish(),
  })
  .transform((summary) => ({
    courseId: summary.course_id,
    worthScore: summary.community_worth_score ?? null,
    reviewCount: summary.review_count,
    averageDifficulty: summary.average_concept_difficulty ?? null,
    workload: Object.fromEntries(WEEKLY_HOURS.map(({ key }) => [key, summary.workload?.[key] ?? 0])) as Record<
      WeeklyHoursKey,
      number
    >,
  }))

export type WorthScore = z.output<typeof worthScoreSchema>

export function getWorthScore(client: ApiClient, courseId: string, signal?: AbortSignal): Promise<WorthScore> {
  return client.request(`/courses/${encodeURIComponent(courseId)}/worth-score`, { schema: worthScoreSchema, signal })
}
