/**
 * Review calls and schemas, following BE2's contract
 * (worththecredit-api/docs/api-contract.md on the BackPart2 branch).
 *
 * Shared module: FE2 wrote the create and "already reviewed" calls (#28).
 * FE1 adds the review list and course stats calls here (#21 to #23), reusing
 * `reviewSchema` for list items.
 */
import { z } from 'zod'
import type { ApiClient } from './client.ts'
import { isGoalKey, type GoalKey, type WeeklyHoursKey } from '../domain/reviewVocabulary.ts'

const score = z.number().int().min(1).max(5)

/** One review, in the anonymous shape BE2 uses everywhere. */
export const reviewSchema = z
  .object({
    id: z.string(),
    course_code: z.string(),
    goals: z.array(z.string()),
    worth_score: score,
    skills: z.array(z.string()),
    difficulty: score,
    weekly_hours: z.string(),
    feedback: z.string().nullish(),
    professor: z.string().nullish(),
    semester: z.string().nullish(),
    created_at: z.string(),
  })
  .transform((review) => ({
    id: review.id,
    courseCode: review.course_code,
    goals: review.goals.filter(isGoalKey),
    worthScore: review.worth_score,
    skills: review.skills,
    difficulty: review.difficulty,
    weeklyHours: review.weekly_hours,
    feedback: review.feedback ?? null,
    professor: review.professor ?? null,
    semester: review.semester ?? null,
    createdAt: review.created_at,
  }))

export type Review = z.output<typeof reviewSchema>

/** The body POST /reviews takes, in BE2's field names. */
export interface ReviewCreateRequest {
  course_code: string
  goals: GoalKey[]
  worth_score: number
  skills: string[]
  difficulty: number
  weekly_hours: WeeklyHoursKey
  feedback: string | null
  professor: string | null
  semester: string | null
}

/** Needs a verified email. Fails with already_reviewed (409), email_not_verified (403), course_not_found (404), or validation_error (422). */
export function createReview(client: ApiClient, request: ReviewCreateRequest, signal?: AbortSignal): Promise<Review> {
  return client.request('/reviews', { method: 'POST', body: request, auth: true, schema: reviewSchema, signal })
}

export const myReviewSchema = z
  .object({
    course_code: z.string(),
    has_reviewed: z.boolean(),
    review: reviewSchema.nullable(),
  })
  .transform((mine) => ({ courseCode: mine.course_code, hasReviewed: mine.has_reviewed, review: mine.review }))

export type MyReview = z.output<typeof myReviewSchema>

/** Whether the signed-in student already reviewed this course (one review per course, any semester). */
export function getMyReview(client: ApiClient, courseCode: string, signal?: AbortSignal): Promise<MyReview> {
  return client.request('/reviews/me', {
    query: { course_code: courseCode },
    auth: true,
    schema: myReviewSchema,
    signal,
  })
}
