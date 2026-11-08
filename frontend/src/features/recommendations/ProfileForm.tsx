import Button from '../../components/form/Button.tsx'
import { TextAreaField, TextField } from '../../components/form/Field.tsx'
import TagInput from '../../components/form/TagInput.tsx'
import { PROFILE_LIMITS } from './profileFormModel.ts'
import styles from './ProfileForm.module.css'
import type { ProfileFormState } from './useProfileForm.ts'

interface ProfileFormProps {
  form: ProfileFormState
  busy: boolean
  onSubmit: () => void
}

/** What the student wants from their next course (#29). State lives in useProfileForm. Owner: FE2. */
export default function ProfileForm({ form, busy, onSubmit }: ProfileFormProps) {
  const { values, errors } = form
  return (
    <form
      className={styles.form}
      noValidate
      aria-labelledby="profile-title"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <header>
        <p className="eyebrow">Course match</p>
        <h1 id="profile-title">Find courses worth your credits</h1>
        <p>
          Tell us what you're after. Gemini compares it with RIT courses and what past students reported, then explains each
          match.
        </p>
      </header>

      <div className={styles.section}>
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
          hint="Academic or personal, like machine learning, game design, or public speaking. Press Enter after each."
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
          label="Career goals"
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
          hint="For example, one more free elective. We won't claim a course satisfies a requirement; check with your advisor."
          value={values.academicGoals}
          onChange={(text) => form.setText('academicGoals', text)}
          maxLength={PROFILE_LIMITS.goalsLength}
          error={errors.academicGoals}
        />
      </div>

      <footer className={styles.footer}>
        {errors.form ? (
          <p className={styles.formError} role="alert">
            {errors.form}
          </p>
        ) : null}
        <Button type="submit" busy={busy}>
          {busy ? 'Finding courses…' : 'Get recommendations'}
        </Button>
        <p className={styles.note}>
          Your answers are sent to Google Gemini to find matches, and remembered only in this browser until you log out.
        </p>
      </footer>
    </form>
  )
}
