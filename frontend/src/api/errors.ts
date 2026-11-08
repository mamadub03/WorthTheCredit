/**
 * One error type for every API failure, so pages switch on `code` instead of
 * reading response bodies. Owner: FE2 (#25). See docs/frontend-coordination.md section 6.
 *
 * `code` is BE2's `detail` string as sent (for example "already_reviewed"),
 * "validation_error" for FastAPI 422s, or one of the client's own codes:
 * "network_error", "timeout", "aborted", "invalid_response".
 */

/** API field name (as the API spells it) to the first validation message for it. */
export type FieldErrors = Record<string, string>

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors: FieldErrors

  constructor(status: number, code: string, message?: string, fieldErrors: FieldErrors = {}) {
    super(message ?? messageForCode(code))
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError
}

const STATUS_CODES: Record<number, string> = {
  400: 'bad_request',
  401: 'not_authenticated',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  422: 'validation_error',
  429: 'rate_limited',
}

/** Builds an ApiError from a non-2xx response body, in any of FastAPI's three `detail` shapes. */
export function errorFromResponse(status: number, body: unknown): ApiError {
  const detail = isRecord(body) ? body.detail : undefined
  if (typeof detail === 'string' && detail.trim() !== '') {
    return new ApiError(status, detail.trim())
  }
  if (Array.isArray(detail)) {
    return new ApiError(status, 'validation_error', undefined, fieldErrorsFrom422(detail))
  }
  if (isRecord(detail) && typeof detail.code === 'string') {
    return new ApiError(status, detail.code, typeof detail.message === 'string' ? detail.message : undefined)
  }
  return new ApiError(status, STATUS_CODES[status] ?? (status >= 500 ? 'server_error' : 'http_error'))
}

/**
 * FastAPI 422 items look like {"loc": ["body", "worth_score"], "msg": "..."}.
 * The entry after the location kind ("body", "query", "path") names the field.
 * Errors about the whole body land under "_form".
 */
export function fieldErrorsFrom422(items: readonly unknown[]): FieldErrors {
  const errors: FieldErrors = {}
  for (const item of items) {
    if (!isRecord(item) || !Array.isArray(item.loc)) continue
    const field: unknown = item.loc[1]
    const key = typeof field === 'string' ? field : '_form'
    const message = typeof item.msg === 'string' ? item.msg.replace(/^Value error, /, '') : 'Check this answer.'
    errors[key] ??= message
  }
  return errors
}

// Student-facing copy per code. Keys are BE2's detail strings plus the client's own codes.
const MESSAGES: Record<string, string> = {
  not_authenticated: 'Please sign in to continue.',
  invalid_token: 'Your sign-in expired. Please sign in again.',
  email_not_verified: 'Verify your email before posting a review.',
  forbidden: "You don't have access to that.",
  course_not_found: "We couldn't find that course.",
  review_not_found: "We couldn't find that review.",
  profile_not_found: "You haven't saved a profile yet.",
  not_found: "We couldn't find that.",
  already_reviewed: "You've already reviewed this course.",
  already_reported: "You've already reported this review.",
  profile_required: 'Add your major and goals first.',
  validation_error: 'Some answers need fixing.',
  bad_request: 'Something about that request was off. Check your answers and try again.',
  rate_limited: 'Too many requests. Wait a minute and try again.',
  recommendation_failed: "Recommendations didn't come through. Try again.",
  gemini_not_configured: "Recommendations aren't set up on the server yet.",
  auth_not_configured: "Sign-in isn't set up on the server yet.",
  auth_unavailable: 'Sign-in is unavailable right now. Try again soon.',
  auth0_error: "Auth0 didn't respond. Try again soon.",
  not_configured: "That isn't set up on the server yet.",
  conflict: 'That conflicts with something already saved.',
  network_error: "Can't reach the server. Check your connection and try again.",
  timeout: 'The server took too long to answer. Try again.',
  aborted: 'The request was cancelled.',
  invalid_response: 'The server sent something unexpected. Try again.',
  http_error: 'Something went wrong. Try again.',
  server_error: 'Something went wrong on our side. Try again.',
}

export function messageForCode(code: string): string {
  return MESSAGES[code] ?? MESSAGES.server_error
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
