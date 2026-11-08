import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { CourseSummary } from '../../api/courses.ts'
import Button from '../../components/form/Button.tsx'
import ChoiceGroup from '../../components/form/ChoiceGroup.tsx'
import { SelectField, TextAreaField, TextField } from '../../components/form/Field.tsx'
import RatingScale from '../../components/form/RatingScale.tsx'
import TagInput from '../../components/form/TagInput.tsx'
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_QUESTION,
  GOALS,
  GOALS_QUESTION,
  SCORES,
  TERMS,
  WEEKLY_HOURS,
  WEEKLY_HOURS_QUESTION,
  WORTH_SCORE_LABELS,
  WORTH_SCORE_QUESTION,
  type Term,
} from '../../domain/reviewVocabulary.ts'
import { COURSES_PATH } from '../../routes/discoveryPaths.ts'
import { paths } from '../../routes/paths.ts'
import CoursePicker from './CoursePicker.tsx'
import styles from './ReviewForm.module.css'
import { REVIEW_LIMITS, reviewFieldId, semesterYears, type ReviewFormValues } from './reviewFormModel.ts'
import type { LoadStatus } from './useCourses.ts'
import type { ReviewFormState } from './useReviewForm.ts'

const worthOptions = SCORES.map((score) => ({ value: score, label: String(score), caption: WORTH_SCORE_LABELS[score] }))
const difficultyOptions = SCORES.map((score) => ({ value: score, label: String(score), caption: DIFFICULTY_LABELS[score] }))
const hoursOptions = WEEKLY_HOURS.map((hours) => ({ value: hours.key, label: hours.key, caption: 'hours' }))
const termOptions = TERMS.map((term) => ({ value: term, label: term }))

const REQUIRED_COUNT = 5

/** The five required answers the progress bar counts, in question order, with how "Still need" names each. */
const REQUIRED: readonly { done: (values: ReviewFormValues) => boolean; missing: string }[] = [
  { done: (values) => values.goals.length > 0, missing: 'your goals' },
  { done: (values) => values.worthScore !== null, missing: 'a Worth Score' },
  { done: (values) => values.conceptDifficulty !== null, missing: 'a difficulty' },
  { done: (values) => values.weeklyHoursRange !== null, missing: 'weekly hours' },
  { done: (values) => values.skillsGained.length > 0, missing: 'one skill' },
]

interface ReviewFormProps {
  form: ReviewFormState
  /** The chosen course once known, from useChosenCourse on the page. */
  course: CourseSummary | null
  courseStatus: LoadStatus
  onCourseChange: (course: CourseSummary | null) => void
  submitting: boolean
  /** A problem with the whole submission, shown above the button. */
  submitError: string | null
  /** An action that fixes the problem, such as signing in again. */
  submitErrorAction?: { label: string; onClick: () => void }
  onSubmit: () => void
}

/**
 * The structured review form (#27) on the College carousel Write a review
 * boards: a header with the progress bar, one white card per question with a
 * step badge that turns orange once answered, the optional card, a side card
 * of rules, and the submit row (a dark sticky bar on a phone). State and rules
 * live in useReviewForm. Owner: FE2.
 */
export default function ReviewForm({
  form,
  course,
  courseStatus,
  onCourseChange,
  submitting,
  submitError,
  submitErrorAction,
  onSubmit,
}: ReviewFormProps) {
  const { values, errors } = form
  const yearOptions = semesterYears().map((year) => ({ value: year, label: year }))
  const done = REQUIRED.map((question) => question.done(values))
  const answered = done.filter(Boolean).length
  const missing = [
    ...(values.courseId ? [] : ['the course']),
    ...REQUIRED.filter((_, index) => !done[index]).map((question) => question.missing),
  ]
  const status = missing.length === 0 ? "Ready to post. You can't edit it afterward." : `Still need ${missing.join(', ')}.`

  return (
    <>
      <header className={`${styles.header} wtc-rise`}>
        <div className={styles.heading}>
          {course ? (
            <p className={styles.reviewing}>
              <span className={styles.wide}>
                Reviewing {course.code} · {course.title}
              </span>
              <span className={styles.narrow}>Reviewing {course.code}</span>
            </p>
          ) : null}
          <h1 id="review-title" className={styles.title}>
            Was it worth the credit?
          </h1>
        </div>
        <div className={`${styles.progress} ${styles.wide}`}>
          <p className={styles.progressRow}>
            <span>
              {answered} of {REQUIRED_COUNT} required
            </span>
            <span className={styles.progressTime}>about 2 minutes</span>
          </p>
          <Progress answered={answered} className={styles.track} />
        </div>
      </header>

      <div className={styles.layout}>
        <form
          className={styles.form}
          noValidate
          aria-labelledby="review-title"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit()
          }}
        >
          <div className={`${styles.card} ${styles.pickerCard} ${errors.courseId ? styles.invalidCard : ''} wtc-rise`}>
            <CoursePicker
              id={reviewFieldId('courseId')}
              courseId={values.courseId}
              course={course}
              status={courseStatus}
              onChange={(picked) => {
                onCourseChange(picked)
                form.setField('courseId', picked?.id ?? null)
              }}
              error={errors.courseId}
            />
          </div>

          <Question step={1} done={done[0]} invalid={Boolean(errors.goals)} title={GOALS_QUESTION} delay="wtc-d1">
            <ChoiceGroup
              id={reviewFieldId('goals')}
              legend={GOALS_QUESTION}
              legendHidden
              hint="Pick all that apply. We use this to match you with students who had the same goals."
              options={GOALS}
              selected={values.goals}
              onToggle={form.toggleGoal}
              error={errors.goals}
            />
          </Question>

          <Question
            step={2}
            done={done[1]}
            invalid={Boolean(errors.worthScore)}
            title="How well did it help you reach those goals?"
            phoneTitle="Did it help you reach those goals?"
            delay="wtc-d2"
          >
            <RatingScale
              id={reviewFieldId('worthScore')}
              legend={WORTH_SCORE_QUESTION}
              legendHidden
              hint="This becomes your Worth Score."
              options={worthOptions}
              value={values.worthScore}
              onChange={(score) => form.setField('worthScore', score)}
              error={errors.worthScore}
            />
          </Question>

          <Question
            step={3}
            done={done[2]}
            invalid={Boolean(errors.conceptDifficulty)}
            title="How hard were the concepts?"
            delay="wtc-d3"
          >
            <RatingScale
              id={reviewFieldId('conceptDifficulty')}
              legend={DIFFICULTY_QUESTION}
              legendHidden
              hint="How hard the ideas are to understand. Not the professor, grading or workload."
              options={difficultyOptions}
              value={values.conceptDifficulty}
              onChange={(score) => form.setField('conceptDifficulty', score)}
              error={errors.conceptDifficulty}
              icon="caps"
            />
          </Question>

          <Question
            step={4}
            done={done[3]}
            invalid={Boolean(errors.weeklyHoursRange)}
            title={WEEKLY_HOURS_QUESTION}
            delay="wtc-d3"
          >
            <RatingScale
              id={reviewFieldId('weeklyHoursRange')}
              legend={WEEKLY_HOURS_QUESTION}
              legendHidden
              hint="Homework, projects and studying, on a typical week."
              options={hoursOptions}
              value={values.weeklyHoursRange}
              onChange={(hours) => form.setField('weeklyHoursRange', hours)}
              error={errors.weeklyHoursRange}
              icon="clock"
            />
          </Question>

          <Question
            step={5}
            done={done[4]}
            invalid={Boolean(errors.skillsGained)}
            title="What skills did you actually walk away with?"
            phoneTitle="Skills you walked away with"
            delay={styles.d4}
          >
            <TagInput
              id={reviewFieldId('skillsGained')}
              label="Skills or knowledge you gained"
              labelHidden
              hint="Add at least one. Type your own and press Enter."
              placeholder="Type a skill…"
              tags={values.skillsGained}
              onAdd={form.addSkill}
              onRemove={form.removeSkill}
              max={REVIEW_LIMITS.maxSkills}
              error={errors.skillsGained}
            />
          </Question>

          <section className={`${styles.card} wtc-rise ${styles.d4}`} aria-labelledby="review-optional-title">
            <div className={styles.optionalHead}>
              <h2 id="review-optional-title" className={styles.optionalTitle}>
                Help future students
              </h2>
              <span className={styles.optionalPill}>Optional</span>
            </div>
            <TextAreaField
              id={reviewFieldId('feedback')}
              label="What should future students know?"
              hint="Please leave out names and anything personal."
              placeholder="Tips, what surprised you, how to do well…"
              value={values.feedback}
              onChange={(text) => form.setField('feedback', text)}
              maxLength={REVIEW_LIMITS.feedbackLength}
              error={errors.feedback}
            />
            <div className={styles.selects}>
              <TextField
                id={reviewFieldId('instructorName')}
                label="Professor"
                value={values.instructorName}
                onChange={(text) => form.setField('instructorName', text)}
                maxLength={REVIEW_LIMITS.instructorLength}
                error={errors.instructorName}
              />
              <SelectField
                id={reviewFieldId('semesterTerm')}
                label="Term taken"
                placeholder="Choose a term"
                options={termOptions}
                value={values.semesterTerm}
                onChange={(term) => form.setField('semesterTerm', term as Term | '')}
                error={errors.semesterTerm}
              />
              <SelectField
                id={reviewFieldId('semesterYear')}
                label="Year"
                placeholder="Choose a year"
                options={yearOptions}
                value={values.semesterYear}
                onChange={(year) => form.setField('semesterYear', year)}
                error={errors.semesterYear}
              />
            </div>
          </section>

          <p className={`${styles.rulesLine} ${styles.narrow}`}>
            Anonymous to other students · One review per course · Can't be edited after posting · Verified RIT email
            required
          </p>

          {submitError ? (
            <div className={styles.alert} role="alert">
              <p>{submitError}</p>
              {submitErrorAction ? (
                <Button variant="dark" className={styles.alertAction} onClick={submitErrorAction.onClick}>
                  {submitErrorAction.label}
                </Button>
              ) : null}
            </div>
          ) : null}

          <div className={styles.submitRow}>
            <div className={`${styles.barProgress} ${styles.narrow}`}>
              <p className={styles.barCount} aria-live="polite">
                {answered} of {REQUIRED_COUNT} required
              </p>
              <Progress answered={answered} className={styles.barTrack} />
            </div>
            <Button type="submit" className={styles.submit} busy={submitting}>
              {submitting ? 'Posting…' : 'Post review'}
            </Button>
            <Link className={`${styles.cancel} ${styles.wide}`} to={values.courseId ? paths.course(values.courseId) : COURSES_PATH}>
              Cancel
            </Link>
            <span className={`${styles.status} ${styles.wide}`} aria-live="polite">
              {status}
            </span>
          </div>
        </form>

        <aside className={styles.aside}>
          <section className={`${styles.rules} wtc-rise wtc-d3`} aria-labelledby="review-rules-title">
            <h2 id="review-rules-title" className={styles.rulesTitle}>
              Before you post
            </h2>
            <Rule tint="lilac" icon="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" title="Anonymous to students">
              Your name and email are never shown.
            </Rule>
            <Rule tint="teal" icon="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" title="One review per course">
              {course ? `You can review ${course.code} once.` : 'You can review each course once.'}
            </Rule>
            <Rule tint="butter" icon="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z" title="Final once posted">
              Double-check before posting.
            </Rule>
            <Rule tint="mint" icon="M5 12.5l4.5 4.5L19 7.5" title="Verified RIT email">
              Only verified students can post.
            </Rule>
          </section>
        </aside>
      </div>
    </>
  )
}

/**
 * One required question's card: a step badge (the number, or a check once
 * answered) beside the board's title, then the control with its hint. The
 * control's own legend stays the group's accessible name (the e2e names) and
 * is visually hidden; the visible title is the board's wording, hidden from
 * screen readers so it isn't read twice.
 */
function Question({
  step,
  done,
  invalid,
  title,
  phoneTitle,
  delay,
  children,
}: {
  step: number
  done: boolean
  invalid: boolean
  title: string
  phoneTitle?: string
  delay: string
  children: ReactNode
}) {
  return (
    <div
      className={[styles.question, invalid ? styles.invalidCard : '', 'wtc-rise', delay]
        .filter(Boolean)
        .join(' ')}
    >
      <span className={`${styles.step} ${done ? styles.stepDone : ''}`} aria-hidden="true">
        {done ? '✓' : step}
      </span>
      <p className={styles.questionTitle} aria-hidden="true">
        {phoneTitle ? (
          <>
            <span className={styles.wide}>{title}</span>
            <span className={styles.narrow}>{phoneTitle}</span>
          </>
        ) : (
          title
        )}
      </p>
      <div className={styles.questionBody}>{children}</div>
    </div>
  )
}

function Progress({ answered, className }: { answered: number; className: string }) {
  return (
    <div
      className={className}
      role="progressbar"
      aria-label="Required questions answered"
      aria-valuemin={0}
      aria-valuemax={REQUIRED_COUNT}
      aria-valuenow={answered}
    >
      <span className={styles.fill} style={{ width: `${(answered / REQUIRED_COUNT) * 100}%` }} />
    </div>
  )
}

const RULE_TINTS = {
  lilac: styles.tintLilac,
  teal: styles.tintTeal,
  butter: styles.tintButter,
  mint: styles.tintMint,
} as const

function Rule({ tint, icon, title, children }: { tint: keyof typeof RULE_TINTS; icon: string; title: string; children: ReactNode }) {
  return (
    <div className={styles.rule}>
      <span className={`${styles.ruleIcon} ${RULE_TINTS[tint]}`} aria-hidden="true">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          focusable="false"
        >
          <path d={icon} />
        </svg>
      </span>
      <div className={styles.ruleText}>
        <p className={styles.ruleTitle}>{title}</p>
        <p className={styles.ruleBody}>{children}</p>
      </div>
    </div>
  )
}
