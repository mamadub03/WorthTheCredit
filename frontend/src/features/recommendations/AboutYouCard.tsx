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
 * "About you": the student's major, interests, skills, and goals (#29), in the
 * Example B AI match layout. Opens in edit mode until there's something to show.
 * Owner: FE2 (#31).
 */
export default function AboutYouCard({ form, busy, onMatch }: AboutYouCardProps) {
  const { values, errors } = form
  const filled = hasPreference(values)
  const [editing, setEditing] = useState(!filled)

  const rows: { label: string; value: string }[] = [
    { label: 'Major', value: values.major.trim() },
    { label: 'Interests', value: values.interests.join(', ') },
    { label: 'Skills', value: values.skills.join(', ') },
    { label: 'Career goal', value: values.careerGoals.trim() },
    { label: 'Academic goals', value: values.academicGoals.trim() },
  ]

  return (
    <section className={styles.card} aria-labelledby="about-you-title">
      <div className={styles.head}>
        <h2 id="about-you-title" className={styles.title}>
          About you
        </h2>
        {!editing ? (
          <Button variant="secondary" size="small" onClick={() => setEditing(true)}>
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
          <Button variant="secondary" onClick={() => setEditing(false)} disabled={!filled}>
            Done
          </Button>
        </div>
      ) : (
        <dl className={styles.rows}>
          {rows.map((row) => (
            <div key={row.label}>
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
        onClick={() => {
          setEditing(false)
          onMatch()
        }}
        disabled={busy}
      >
        Match me with courses
      </Button>
      <p className={styles.note}>
        Saved in this browser so you don't have to repeat it. Your answers go to Google Gemini to find matches.
      </p>
    </section>
  )
}
