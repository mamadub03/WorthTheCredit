import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { isApiError } from '../../api/errors.ts'
import { createReview } from '../../api/reviews.ts'
import { paths } from '../../routes/paths.ts'
import RequireAuth from '../auth/RequireAuth.tsx'
import { useApiClient } from '../auth/useApiClient.ts'
import ReviewForm from './ReviewForm.tsx'
import { reviewFieldId, type ReviewField } from './reviewFormModel.ts'
import { useReviewForm } from './useReviewForm.ts'

/**
 * /review, with ?course=<id> to preselect a course. Needs a signed-in student
 * with a verified email. Owner: FE2 (#27).
 */
export default function WriteReviewPage() {
  return (
    <RequireAuth requireVerifiedEmail>
      <WriteReview />
    </RequireAuth>
  )
}

function WriteReview() {
  const [params] = useSearchParams()
  const form = useReviewForm(params.get('course'))
  const client = useApiClient()
  const [status, setStatus] = useState<'editing' | 'submitting' | 'posted'>('editing')
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function submit() {
    const checked = form.validate()
    if (!checked.ok) {
      focusField(checked.firstInvalid)
      return
    }
    setStatus('submitting')
    setSubmitError(null)
    try {
      await createReview(client, checked.review.courseId, checked.review.body)
      setStatus('posted')
    } catch (error) {
      setStatus('editing')
      setSubmitError(isApiError(error) ? error.message : 'Something went wrong. Try again.')
    }
  }

  if (status === 'posted' && form.values.courseId) {
    return (
      <section className="panel" aria-live="polite">
        <p className="eyebrow">Thank you</p>
        <h1>Review posted</h1>
        <p>It now counts toward the course's Worth Score and helps the next student decide.</p>
        <p>
          <Link to={paths.course(form.values.courseId)}>See the course</Link>
        </p>
      </section>
    )
  }

  return <ReviewForm form={form} submitting={status === 'submitting'} submitError={submitError} onSubmit={() => void submit()} />
}

/** Moves keyboard focus to the first control of a question. */
function focusField(field: ReviewField) {
  const container = document.getElementById(reviewFieldId(field))
  const target = container?.matches('input, select, textarea, button')
    ? container
    : container?.querySelector<HTMLElement>('input, select, textarea, button')
  target?.focus()
}
