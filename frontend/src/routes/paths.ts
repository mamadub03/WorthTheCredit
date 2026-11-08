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
  /** The sign-in page. `next` is the page to return to afterwards (see signInReturnPath). */
  signIn: (next?: string) => (next ? `/signin?next=${encodeURIComponent(next)}` : '/signin'),
  authCallback: '/callback',
} as const

/**
 * Where to land after signing in, from /signin?next=. Only paths on this site
 * count, so a crafted link can't bounce a student to another site, and the
 * sign-in pages themselves fall back to home.
 */
export function signInReturnPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return paths.home
  const pathname = next.split(/[?#]/, 1)[0]
  if (pathname === paths.signIn() || pathname === paths.authCallback) return paths.home
  return next
}

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
