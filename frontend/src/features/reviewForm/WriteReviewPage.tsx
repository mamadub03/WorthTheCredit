import { useEffect, type ReactNode } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import type { CourseSummary } from '../../api/courses.ts'
import type { Review } from '../../api/reviews.ts'
import sealUrl from '../../assets/brand/seal.svg'
import Button from '../../components/form/Button.tsx'
import ButtonLink from '../../components/form/ButtonLink.tsx'
import Coin from '../../components/ui/Coin.tsx'
import { COURSES_PATH } from '../../routes/discoveryPaths.ts'
import { paths } from '../../routes/paths.ts'
import { useAuth } from '../auth/authContext.ts'
import RequireAuth from '../auth/RequireAuth.tsx'
import ReviewForm from './ReviewForm.tsx'
import styles from './WriteReviewPage.module.css'
import { REVIEW_FIELD_ORDER, reviewFieldId, type ReviewField } from './reviewFormModel.ts'
import { useChosenCourse } from './useCourses.ts'
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
  const chosen = useChosenCourse(form.values.courseId)

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

  let content: ReactNode
  if (outcome.status === 'posted') {
    content = <PostedCard review={outcome.review} course={chosen.course} />
  } else if (outcome.status === 'already_reviewed') {
    content = (
      <OutcomeCard
        title="You've already reviewed this course"
        art={<img className={styles.seal} src={sealUrl} alt="" aria-hidden="true" draggable={false} />}
        actions={
          <>
            <Button
              className={styles.action}
              onClick={() => {
                form.setField('courseId', null)
                reset()
              }}
            >
              Review a different course
            </Button>
            <ButtonLink to={paths.course(outcome.courseId)} variant="secondary" className={styles.actionSoft}>
              See the course
            </ButtonLink>
          </>
        }
      >
        Each student gets one review per course, and reviews can't be edited after posting.
      </OutcomeCard>
    )
  } else {
    const problem = outcome.status === 'error' ? outcome : null
    const returnTo = location.pathname + location.search
    content = (
      <ReviewForm
        form={form}
        course={chosen.course}
        courseStatus={chosen.status}
        onCourseChange={chosen.choose}
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

  return (
    <div className={styles.page}>
      <Breadcrumb course={chosen.course} />
      {content}
    </div>
  )
}

/** Desktop only: Courses / {code} / Write a review. On a phone Grace's shell has the back button. */
function Breadcrumb({ course }: { course: CourseSummary | null }) {
  return (
    <nav className={styles.breadcrumb} aria-label="Breadcrumb">
      <ol>
        <li>
          <Link to={COURSES_PATH}>Courses</Link>
        </li>
        {course ? (
          <li>
            <span aria-hidden="true">/</span>
            <Link to={paths.course(course.id)}>{course.code}</Link>
          </li>
        ) : null}
        <li>
          <span aria-hidden="true">/</span>
          <span className={styles.current} aria-current="page">
            Write a review
          </span>
        </li>
      </ol>
    </nav>
  )
}

/**
 * The card that replaces the form once it resolves (the posted board, and the
 * already-reviewed state built from it): art, an h1, a short paragraph, extra
 * content and centered actions. Announced politely when it appears.
 */
function OutcomeCard({
  title,
  art,
  children,
  extra,
  actions,
}: {
  title: string
  art: ReactNode
  children: ReactNode
  extra?: ReactNode
  actions: ReactNode
}) {
  return (
    <section className={`${styles.outcome} wtc-rise`} aria-labelledby="review-outcome-title" aria-live="polite">
      {art}
      <h1 id="review-outcome-title" className={styles.outcomeTitle}>
        {title}
      </h1>
      <p className={styles.outcomeText}>{children}</p>
      {extra}
      <div className={styles.actions}>{actions}</div>
    </section>
  )
}

/** The posted board: the tossed seal coin, where it went, and the answers as pills. */
function PostedCard({ review, course }: { review: Review; course: CourseSummary | null }) {
  const code = course?.id === review.courseId ? course.code : 'the course'
  return (
    <OutcomeCard
      title="Review posted"
      art={
        <span className={styles.coin}>
          <Coin size={140} />
        </span>
      }
      extra={
        <p className={styles.pills}>
          <span className={styles.pillWorth}>Worth {review.worthScore} / 5</span>
          <span className={styles.pillDifficulty}>Difficulty {review.conceptDifficulty} / 5</span>
          <span className={styles.pillHours}>{review.weeklyHoursRange} h/wk</span>
        </p>
      }
      actions={
        <>
          <ButtonLink to={paths.course(review.courseId)} className={styles.action}>
            See the course
          </ButtonLink>
          <ButtonLink to={paths.recommendations} variant="secondary" className={styles.actionSoft}>
            Find your next course
          </ButtonLink>
        </>
      }
    >
      Posted anonymously to {code}. Other students will see your scores and tips, never your name or email.
    </OutcomeCard>
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
