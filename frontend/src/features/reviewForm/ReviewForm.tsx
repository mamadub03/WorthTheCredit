import Button from '../../components/form/Button.tsx'
import ChoiceGroup from '../../components/form/ChoiceGroup.tsx'
import { SelectField, TextAreaField, TextField } from '../../components/form/Field.tsx'
import formStyles from '../../components/form/form.module.css'
import RatingScale from '../../components/form/RatingScale.tsx'
import TagInput from '../../components/form/TagInput.tsx'
import {
  DIFFICULTY_HINT,
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
import CoursePicker from './CoursePicker.tsx'
import styles from './ReviewForm.module.css'
import { REVIEW_LIMITS, reviewFieldId, semesterYears } from './reviewFormModel.ts'
import type { ReviewFormState } from './useReviewForm.ts'

const worthOptions = SCORES.map((score) => ({ value: score, label: String(score), caption: WORTH_SCORE_LABELS[score] }))
const difficultyOptions = SCORES.map((score) => ({ value: score, label: String(score), caption: DIFFICULTY_LABELS[score] }))
const hoursOptions = WEEKLY_HOURS.map((hours) => ({ value: hours.key, label: hours.key, caption: 'hours' }))
const termOptions = TERMS.map((term) => ({ value: term, label: term }))

interface ReviewFormProps {
  form: ReviewFormState
  submitting: boolean
  /** A problem with the whole submission, shown above the button. */
  submitError: string | null
  onSubmit: () => void
}

/** The structured review form (#27). State and rules live in useReviewForm. Owner: FE2. */
export default function ReviewForm({ form, submitting, submitError, onSubmit }: ReviewFormProps) {
  const { values, errors } = form
  const yearOptions = semesterYears().map((year) => ({ value: year, label: year }))

  return (
    <form
      className={styles.form}
      noValidate
      aria-labelledby="review-title"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <header className={styles.header}>
        <span className={styles.tag}>Write a review</span>
        <h1 id="review-title" className={styles.title}>
          Was it worth the credit?
        </h1>
        <p className={styles.lead}>
          Your review is anonymous. Rate the course itself, so future students can tell whether it fits their goals.
        </p>
      </header>

      <div className={styles.section}>
        <CoursePicker
          id={reviewFieldId('courseId')}
          courseId={values.courseId}
          onChange={(course) => form.setField('courseId', course?.id ?? null)}
          error={errors.courseId}
        />
      </div>

      <div className={styles.section}>
        <ChoiceGroup
          id={reviewFieldId('goals')}
          legend={GOALS_QUESTION}
          hint="Pick all that apply."
          options={GOALS}
          selected={values.goals}
          onToggle={form.toggleGoal}
          error={errors.goals}
        />
        <RatingScale
          id={reviewFieldId('worthScore')}
          legend={WORTH_SCORE_QUESTION}
          hint="This is the course's Worth Score: 1 means it didn't help at all, 5 means completely."
          options={worthOptions}
          value={values.worthScore}
          onChange={(score) => form.setField('worthScore', score)}
          error={errors.worthScore}
        />
        <TagInput
          id={reviewFieldId('skillsGained')}
          label="Skills or knowledge you gained"
          hint="Press Enter after each one, like Python, user research, or public speaking."
          tags={values.skillsGained}
          onAdd={form.addSkill}
          onRemove={form.removeSkill}
          max={REVIEW_LIMITS.maxSkills}
          error={errors.skillsGained}
        />
      </div>

      <div className={styles.section}>
        <RatingScale
          id={reviewFieldId('conceptDifficulty')}
          legend={DIFFICULTY_QUESTION}
          hint={DIFFICULTY_HINT}
          options={difficultyOptions}
          value={values.conceptDifficulty}
          onChange={(score) => form.setField('conceptDifficulty', score)}
          error={errors.conceptDifficulty}
        />
        <RatingScale
          id={reviewFieldId('weeklyHoursRange')}
          legend={WEEKLY_HOURS_QUESTION}
          hint="Homework, projects, and studying, in a typical week."
          options={hoursOptions}
          value={values.weeklyHoursRange}
          onChange={(hours) => form.setField('weeklyHoursRange', hours)}
          error={errors.weeklyHoursRange}
        />
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Context for future students</h2>
        <TextAreaField
          id={reviewFieldId('feedback')}
          label="What should future students know?"
          optional
          hint="Topics, assignments, projects, or advice. Please leave out names and anything personal."
          value={values.feedback}
          onChange={(text) => form.setField('feedback', text)}
          maxLength={REVIEW_LIMITS.feedbackLength}
          error={errors.feedback}
        />
        <TextField
          id={reviewFieldId('instructorName')}
          label="Professor"
          optional
          hint="Context only. Reviews rate the course, not the professor."
          value={values.instructorName}
          onChange={(text) => form.setField('instructorName', text)}
          maxLength={REVIEW_LIMITS.instructorLength}
          error={errors.instructorName}
        />
        <div className={formStyles.row}>
          <SelectField
            id={reviewFieldId('semesterTerm')}
            label="Term taken"
            optional
            placeholder="Choose a term"
            options={termOptions}
            value={values.semesterTerm}
            onChange={(term) => form.setField('semesterTerm', term as Term | '')}
            error={errors.semesterTerm}
          />
          <SelectField
            id={reviewFieldId('semesterYear')}
            label="Year"
            optional
            placeholder="Choose a year"
            options={yearOptions}
            value={values.semesterYear}
            onChange={(year) => form.setField('semesterYear', year)}
            error={errors.semesterYear}
          />
        </div>
      </div>

      <footer className={styles.footer}>
        {submitError ? (
          <p className={styles.submitError} role="alert">
            {submitError}
          </p>
        ) : null}
        <Button type="submit" busy={submitting}>
          {submitting ? 'Posting…' : 'Post review'}
        </Button>
        <p className={styles.note}>One review per course, and reviews can't be edited after posting.</p>
      </footer>
    </form>
  )
}
