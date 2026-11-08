import { useState } from 'react'
import Button from '../../components/form/Button.tsx'
import { TextAreaField, TextField } from '../../components/form/Field.tsx'
import TagInput from '../../components/form/TagInput.tsx'
import styles from './AboutYouCard.module.css'
import { hasPreference, PROFILE_LIMITS } from './profileFormModel.ts'
import type { ProfileFormState } from './useProfileForm.ts'

interface AboutYouCardProps {
  form: ProfileFormState
  busy: boolean
  onMatch: () => void
}

/**
 * "About you": the student's major, interests, skills, and goals (#29), as the
 * peach panel on the College carousel AI board. It opens on the form until
 * there's something to show, then shows the board's summary with Edit. On a
 * phone the summary becomes the board's scrolling chip row. Owner: FE2 (#31).
 */
export default function AboutYouCard({ form, busy, onMatch }: AboutYouCardProps) {
  const { values, errors } = form
  const filled = hasPreference(values)
  const [editing, setEditing] = useState(!filled)

  const rows: { label: string; value: string; always: boolean }[] = [
    { label: 'Major', value: values.major.trim(), always: true },
    { label: 'Interests', value: values.interests.join(', '), always: true },
    { label: 'Skills', value: values.skills.join(', '), always: true },
    { label: 'Career goal', value: values.careerGoals.trim(), always: true },
    { label: 'Academic goals', value: values.academicGoals.trim(), always: false },
  ]

  return (
    <section
      className={`${styles.card} ${editing ? '' : styles.summary} wtc-rise`}
      aria-labelledby="about-you-title"
    >
      <div className={styles.head}>
        <h2 id="about-you-title" className={styles.title}>
          About you
        </h2>
        {!editing ? (
          <Button variant="secondary" size="small" className={styles.edit} onClick={() => setEditing(true)}>
            Edit
          </Button>
        ) : null}
      </div>

      {editing ? (
        <div className={styles.fields}>
          <TextField
            id="profile-major"
            label="Major"
            placeholder="Software Engineering"
            value={values.major}
            onChange={(text) => form.setText('major', text)}
            maxLength={PROFILE_LIMITS.majorLength}
            error={errors.major}
          />
          <TagInput
            id="profile-interests"
            label="Interests"
            hint="Academic or personal, like machine learning or game design. Press Enter after each."
            tags={values.interests}
            onAdd={(text) => form.addTag('interests', text)}
            onRemove={(tag) => form.removeTag('interests', tag)}
            max={PROFILE_LIMITS.maxTags}
            error={errors.interests}
          />
          <TagInput
            id="profile-skills"
            label="Skills you already have"
            optional
            hint="Like Python, Figma, or statistics."
            tags={values.skills}
            onAdd={(text) => form.addTag('skills', text)}
            onRemove={(tag) => form.removeTag('skills', tag)}
            max={PROFILE_LIMITS.maxTags}
            error={errors.skills}
          />
          <TextAreaField
            id="profile-careerGoals"
            label="Career goal"
            hint="Where you want this to lead, like ML engineer in healthcare."
            value={values.careerGoals}
            onChange={(text) => form.setText('careerGoals', text)}
            maxLength={PROFILE_LIMITS.goalsLength}
            error={errors.careerGoals}
          />
          <TextAreaField
            id="profile-academicGoals"
            label="Academic goals or requirements"
            optional
            hint="For example, one more free elective. The advisor can't confirm requirements; check with your advisor."
            value={values.academicGoals}
            onChange={(text) => form.setText('academicGoals', text)}
            maxLength={PROFILE_LIMITS.goalsLength}
            error={errors.academicGoals}
          />
          <Button variant="secondary" className={styles.done} onClick={() => setEditing(false)} disabled={!filled}>
            Done
          </Button>
        </div>
      ) : (
        <dl className={styles.rows}>
          {rows
            .filter((row) => row.always || row.value)
            .map((row) => (
              <div key={row.label} className={row.value ? styles.row : `${styles.row} ${styles.rowUnset}`}>
                <dt>{row.label}</dt>
                <dd>{row.value || <span className={styles.unset}>Not set</span>}</dd>
              </div>
            ))}
        </dl>
      )}

      {errors.form ? (
        <p className={styles.error} role="alert">
          {errors.form}
        </p>
      ) : null}
      <Button
        variant="dark"
        className={styles.match}
        onClick={() => {
          setEditing(false)
          onMatch()
        }}
        disabled={busy}
      >
        Match me with courses
      </Button>
      <p className={styles.note}>
        The advisor remembers this in this browser, so you don’t have to repeat it. Your answers go to Google Gemini to find matches.
      </p>
    </section>
  )
}
