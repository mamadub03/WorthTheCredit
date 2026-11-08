/**
 * URL helper for FE1's search results page, /courses?q=&college=&department=.
 * Kept beside FE2's paths.ts (which FE2 owns) until it can move in there.
 * Owner: FE1 (#20).
 */

export const COURSES_PATH = '/courses'

export function coursesSearch(options: { q?: string; college?: string; department?: string } = {}): string {
  const params = new URLSearchParams()
  if (options.q?.trim()) params.set('q', options.q.trim())
  if (options.college) params.set('college', options.college)
  if (options.department) params.set('department', options.department)
  const query = params.toString()
  return query ? `${COURSES_PATH}?${query}` : COURSES_PATH
}
