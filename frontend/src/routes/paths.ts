/**
 * URL helpers, so no page hardcodes a path string. Course ids are the UUIDs
 * the API uses (GET /courses/{id}). Owner: FE2 (#25).
 * See docs/frontend-coordination.md section 2.
 */

export const paths = {
  home: '/',
  course: (courseId: string) => `/courses/${encodeURIComponent(courseId)}`,
  /** The review form. With a course id, that course is preselected in the picker. */
  writeReview: (courseId?: string) => (courseId ? `/review?course=${encodeURIComponent(courseId)}` : '/review'),
  recommendations: '/recommendations',
  authCallback: '/callback',
} as const

/**
 * The canonical form of an RIT course code: "swen261", "SWEN 261", and
 * " swen-261 " all become "SWEN-261". Used to clean up what students type in
 * the course picker. Input that isn't a course code comes back trimmed.
 */
export function normalizeCourseCode(input: string): string {
  const trimmed = input.trim()
  const match = /^([A-Za-z]{4})[\s-]*(\d{3})$/.exec(trimmed)
  return match ? `${match[1].toUpperCase()}-${match[2]}` : trimmed
}
