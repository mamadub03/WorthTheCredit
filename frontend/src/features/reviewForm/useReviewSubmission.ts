/**
 * Posts a validated review and turns every response into something the page
 * can show. Owner: FE2 (#28).
 *
 * BE2's contract on main: POST /courses/{course_id}/reviews answers 201 with
 * the review, 401 when signed out, 403 when the email isn't verified, 404 for
 * an unknown course, 409 when this student already reviewed the course, and
 * 422 when a field fails validation. Status codes decide here, so it works
 * whether `detail` is a code or a sentence.
 */
import { useCallback, useState } from 'react'
import { isApiError, messageForCode, type FieldErrors } from '../../api/errors.ts'
import { createReview, type Review } from '../../api/reviews.ts'
import { useApiClient } from '../auth/useApiClient.ts'
import { API_FIELD_TO_FORM, type ReviewErrors, type ValidReview } from './reviewFormModel.ts'

export type SubmissionProblem = 'signed_out' | 'unverified' | 'course_missing' | 'rejected' | 'failed'

export type SubmissionOutcome =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'posted'; review: Review }
  | { status: 'already_reviewed'; courseId: string }
  | { status: 'error'; problem: SubmissionProblem; message: string; fieldErrors: ReviewErrors }

/** Maps a 422's API field names onto the form; anything unmapped goes into the general message. */
export function toFormErrors(fieldErrors: FieldErrors): { fields: ReviewErrors; other: string[] } {
  const fields: ReviewErrors = {}
  const other: string[] = []
  for (const [apiField, message] of Object.entries(fieldErrors)) {
    const formField = API_FIELD_TO_FORM[apiField]
    if (formField) fields[formField] ??= message
    else other.push(message)
  }
  return { fields, other }
}

export function useReviewSubmission() {
  const client = useApiClient()
  const [outcome, setOutcome] = useState<SubmissionOutcome>({ status: 'idle' })

  const submit = useCallback(
    async (review: ValidReview): Promise<SubmissionOutcome> => {
      setOutcome({ status: 'submitting' })
      let next: SubmissionOutcome
      try {
        next = { status: 'posted', review: await createReview(client, review.courseId, review.body) }
      } catch (error) {
        next = outcomeForError(error, review.courseId)
      }
      setOutcome(next)
      return next
    },
    [client],
  )

  const reset = useCallback(() => setOutcome({ status: 'idle' }), [])

  return { outcome, submit, reset }
}

function outcomeForError(error: unknown, courseId: string): SubmissionOutcome {
  const problem = (kind: SubmissionProblem, message: string, fieldErrors: ReviewErrors = {}): SubmissionOutcome => ({
    status: 'error',
    problem: kind,
    message,
    fieldErrors,
  })
  if (!isApiError(error)) return problem('failed', messageForCode('server_error'))

  switch (error.status) {
    case 409:
      return { status: 'already_reviewed', courseId }
    case 401:
      return problem('signed_out', 'Your sign-in expired. Sign in again, and your answers will still be here.')
    case 403:
      return problem('unverified', messageForCode('email_not_verified'))
    case 404:
      return problem('course_missing', "We couldn't find that course anymore. Pick it again.", {
        courseId: "We couldn't find that course. Pick it again.",
      })
    case 422: {
      const { fields, other } = toFormErrors(error.fieldErrors)
      const message = other.length > 0 ? `Some answers need fixing: ${other.join(' ')}` : 'Some answers need fixing.'
      return problem('rejected', message, fields)
    }
    default:
      return problem('failed', error.message)
  }
}
