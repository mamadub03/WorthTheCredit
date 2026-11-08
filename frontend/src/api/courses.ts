/**
 * Course lookups. FE1 owns this module (#23) and adds search here; FE2 added
 * the detail call its review page needs. Until the backend pair settles one
 * schema, it accepts BE2's names (course_code, credit_hours) and BE1's
 * (code, credits) and hands pages one shape.
 */
import { z } from 'zod'
import type { ApiClient } from './client.ts'

export const courseSchema = z
  .object({
    course_code: z.string().optional(),
    code: z.string().optional(),
    title: z.string(),
    department: z.string().nullish(),
    credit_hours: z.number().nullish(),
    credits: z.number().nullish(),
    description: z.string().nullish(),
    prerequisites: z.string().nullish(),
  })
  .refine((course) => Boolean(course.course_code ?? course.code), { error: 'course has no code' })
  .transform((course) => ({
    code: (course.course_code ?? course.code) as string,
    title: course.title,
    department: course.department ?? null,
    credits: course.credit_hours ?? course.credits ?? null,
    description: course.description ?? null,
    prerequisites: course.prerequisites ?? null,
  }))

export type Course = z.output<typeof courseSchema>

export function getCourse(client: ApiClient, courseCode: string, signal?: AbortSignal): Promise<Course> {
  return client.request(`/courses/${encodeURIComponent(courseCode)}`, { schema: courseSchema, signal })
}
