/**
 * Course lookups against BE1's live API on main: GET /courses (search) and
 * GET /courses/{id} (details with Worth Score aggregates). Course ids are UUIDs.
 * FE1 owns this module (#23); FE2 uses it for the review form's course picker.
 */
import { z } from 'zod'
import type { ApiClient } from './client.ts'

const courseWire = z.object({
  id: z.string().min(1),
  code: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  department: z.string().nullish(),
  college: z.string().nullish(),
  campus: z.string().nullish(),
  credits: z.number().nullish(),
  prerequisites: z.string().nullish(),
})

function toCourse(course: z.output<typeof courseWire>) {
  return {
    id: course.id,
    code: course.code,
    title: course.title,
    description: course.description ?? '',
    department: course.department ?? null,
    college: course.college ?? null,
    campus: course.campus ?? null,
    credits: course.credits ?? null,
    prerequisites: course.prerequisites || null,
  }
}

export const courseSummarySchema = courseWire.transform(toCourse)
export type CourseSummary = z.output<typeof courseSummarySchema>

export const courseDetailSchema = courseWire
  .extend({
    community_worth_score: z.number().nullish(),
    review_count: z.number().int().nonnegative().nullish(),
    average_concept_difficulty: z.number().nullish(),
  })
  .transform((course) => ({
    ...toCourse(course),
    /** Average Worth Score, null while the course has no reviews. */
    worthScore: course.community_worth_score ?? null,
    reviewCount: course.review_count ?? 0,
    averageDifficulty: course.average_concept_difficulty ?? null,
  }))
export type CourseDetail = z.output<typeof courseDetailSchema>

export const courseSearchSchema = z.object({
  results: z.array(courseSummarySchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int(),
  offset: z.number().int(),
})
export type CourseSearchResult = z.output<typeof courseSearchSchema>

export interface CourseSearchQuery {
  /** Matched against code, title, and description. */
  q?: string
  /** Course code, case-insensitive "contains". */
  code?: string
  /** Department code, case-insensitive exact. */
  department?: string
  limit?: number
  offset?: number
}

export function searchCourses(client: ApiClient, query: CourseSearchQuery, signal?: AbortSignal): Promise<CourseSearchResult> {
  return client.request('/courses', {
    query: { q: query.q, code: query.code, department: query.department, limit: query.limit, offset: query.offset },
    schema: courseSearchSchema,
    signal,
  })
}

export function getCourse(client: ApiClient, courseId: string, signal?: AbortSignal): Promise<CourseDetail> {
  return client.request(`/courses/${encodeURIComponent(courseId)}`, { schema: courseDetailSchema, signal })
}
