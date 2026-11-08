import { useEffect } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import Button from '../../components/form/Button.tsx'
import { paths } from '../../routes/paths.ts'
import { useAuth } from '../auth/authContext.ts'
import RequireAuth from '../auth/RequireAuth.tsx'
import ReviewForm from './ReviewForm.tsx'
import { REVIEW_FIELD_ORDER, reviewFieldId, type ReviewField } from './reviewFormModel.ts'
import { useReviewDraft } from './useReviewDraft.ts'
import { useReviewForm } from './useReviewForm.ts'
import { useReviewSubmission } from './useReviewSubmission.ts'

/**
 * /review, with ?course=<id> to preselect a course. Needs a signed-in student
 * with a verified email. Owner: FE2 (#27, #28).
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
  const location = useLocation()
  const auth = useAuth()
  const urlCourseId = params.get('course')
  const form = useReviewForm(urlCourseId)
  const { outcome, submit, reset } = useReviewSubmission()
  const { setServerErrors } = form

  useReviewDraft(auth.user?.sub ?? null, form.values, form.restore, {
    urlCourseId,
    finished: outcome.status === 'posted',
  })

  // Show field messages from a rejected submission (422, or a course that disappeared).
  useEffect(() => {
    if (outcome.status === 'error') setServerErrors(outcome.fieldErrors)
  }, [outcome, setServerErrors])

  async function onSubmit() {
    const checked = form.validate()
    if (!checked.ok) {
      focusField(checked.firstInvalid)
      return
    }
    const result = await submit(checked.review)
    if (result.status === 'error') {
      const first = REVIEW_FIELD_ORDER.find((field) => result.fieldErrors[field])
      if (first) focusField(first)
    }
  }

  if (outcome.status === 'posted') {
    return (
      <section className="panel" aria-live="polite">
        <p className="eyebrow">Thank you</p>
        <h1>Review posted</h1>
        <p>It now counts toward the course's Worth Score and helps the next student decide.</p>
        <p>
          <Link to={paths.course(outcome.review.courseId)}>See the course</Link>
          {' · '}
          <Link to={paths.recommendations}>Find your next course</Link>
        </p>
      </section>
    )
  }

  if (outcome.status === 'already_reviewed') {
    return (
      <section className="panel" aria-live="polite">
        <p className="eyebrow">One review per course</p>
        <h1>You've already reviewed this course</h1>
        <p>Each student gets one review per course, and reviews can't be edited after posting.</p>
        <p>
          <Link to={paths.course(outcome.courseId)}>See the course</Link>
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            form.setField('courseId', null)
            reset()
          }}
        >
          Review a different course
        </Button>
      </section>
    )
  }

  const problem = outcome.status === 'error' ? outcome : null
  const returnTo = location.pathname + location.search

  return (
    <ReviewForm
      form={form}
      submitting={outcome.status === 'submitting'}
      submitError={problem?.message ?? null}
      submitErrorAction={
        problem?.problem === 'signed_out'
          ? { label: 'Sign in again', onClick: () => void auth.login({ returnTo }) }
          : problem?.problem === 'unverified'
            ? { label: "I've verified my email", onClick: () => void auth.refreshUser() }
            : undefined
      }
      onSubmit={() => void onSubmit()}
    />
  )
}

/** Moves keyboard focus to the first control of a question. */
function focusField(field: ReviewField) {
  const container = document.getElementById(reviewFieldId(field))
  const target = container?.matches('input, select, textarea, button')
    ? container
    : container?.querySelector<HTMLElement>('input, select, textarea, button')
  target?.focus()
}
