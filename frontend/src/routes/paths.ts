/**
 * URL helpers, so no page hardcodes a path string. Course URLs use the course
 * code (GCIS-123), which every BE2 endpoint takes as course_code.
 * Owner: FE2 (#25). See docs/frontend-coordination.md section 2.
 */

export const paths = {
  home: '/',
  course: (courseCode: string) => `/courses/${encodeURIComponent(courseCode)}`,
  writeReview: (courseCode: string) => `/courses/${encodeURIComponent(courseCode)}/review`,
  recommendations: '/recommendations',
  authCallback: '/callback',
} as const

/**
 * The canonical form of an RIT course code, the same normalization BE2 applies:
 * "swen261", "SWEN 261", and " swen-261 " all become "SWEN-261".
 * Input that doesn't look like a course code comes back trimmed and uppercased.
 */
export function normalizeCourseCode(input: string): string {
  const compact = input.trim().toUpperCase()
  const match = /^([A-Z]{4})[\s-]*(\d{3})$/.exec(compact)
  return match ? `${match[1]}-${match[2]}` : compact
}
