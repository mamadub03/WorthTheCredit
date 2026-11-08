/**
 * Review form state: values, which errors to show, and validation. The view
 * renders what this returns; nothing here talks to the API. Owner: FE2 (#27).
 */
import { useCallback, useMemo, useState } from 'react'
import type { GoalKey } from '../../domain/reviewVocabulary.ts'
import {
  addSkill,
  emptyReview,
  REVIEW_FIELD_ORDER,
  toReviewRequest,
  validateReview,
  type ReviewErrors,
  type ReviewField,
  type ReviewFormValues,
  type ValidReview,
} from './reviewFormModel.ts'

export interface ReviewFormState {
  values: ReviewFormValues
  /** Errors to show: for fields already answered, for everything after a submit attempt, and from the server. */
  errors: ReviewErrors
  setField<K extends ReviewField>(field: K, value: ReviewFormValues[K]): void
  toggleGoal(goal: GoalKey): void
  /** Returns true when the tag box should clear. */
  addSkill(text: string): boolean
  removeSkill(skill: string): void
  /** Validates everything. On failure it shows every error and names the first field to fix. */
  validate(): { ok: true; review: ValidReview } | { ok: false; firstInvalid: ReviewField }
  /** Shows messages the API sent back for specific fields (a 422). */
  setServerErrors(errors: ReviewErrors): void
  /** Replaces all values, for example from a saved draft. */
  restore(values: ReviewFormValues): void
}

export function useReviewForm(initialCourseId: string | null): ReviewFormState {
  const [values, setValues] = useState<ReviewFormValues>(() => emptyReview(initialCourseId))
  const [touched, setTouched] = useState<ReadonlySet<ReviewField>>(() => new Set())
  const [attempted, setAttempted] = useState(false)
  const [skillError, setSkillError] = useState<string | null>(null)
  const [serverErrors, setServerErrors] = useState<ReviewErrors>({})

  const problems = useMemo(() => validateReview(values), [values])

  const errors = useMemo(() => {
    const visible: ReviewErrors = {}
    for (const field of REVIEW_FIELD_ORDER) {
      const message = serverErrors[field] ?? (attempted || touched.has(field) ? problems[field] : undefined)
      if (message) visible[field] = message
    }
    if (skillError) visible.skillsGained = skillError
    return visible
  }, [problems, touched, attempted, skillError, serverErrors])

  const update = useCallback(<K extends ReviewField>(field: K, next: (current: ReviewFormValues[K]) => ReviewFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: next(current[field]) }) as ReviewFormValues)
    setTouched((current) => (current.has(field) ? current : new Set(current).add(field)))
    setServerErrors((current) => {
      if (!(field in current)) return current
      const rest = { ...current }
      delete rest[field]
      return rest
    })
  }, [])

  const setField = useCallback(
    <K extends ReviewField>(field: K, value: ReviewFormValues[K]) => update(field, () => value),
    [update],
  )

  const toggleGoal = useCallback(
    (goal: GoalKey) => update('goals', (goals) => (goals.includes(goal) ? goals.filter((item) => item !== goal) : [...goals, goal])),
    [update],
  )

  const addSkillText = useCallback(
    (text: string) => {
      const result = addSkill(values.skillsGained, text)
      setSkillError(result.error)
      if (result.error) return false
      if (result.skills.length !== values.skillsGained.length) update('skillsGained', () => result.skills)
      return true
    },
    [values.skillsGained, update],
  )

  const removeSkill = useCallback(
    (skill: string) => {
      setSkillError(null)
      update('skillsGained', (skills) => skills.filter((item) => item !== skill))
    },
    [update],
  )

  const validate = useCallback((): { ok: true; review: ValidReview } | { ok: false; firstInvalid: ReviewField } => {
    setAttempted(true)
    const found = validateReview(values)
    const firstInvalid = REVIEW_FIELD_ORDER.find((field) => found[field])
    return firstInvalid ? { ok: false, firstInvalid } : { ok: true, review: toReviewRequest(values) }
  }, [values])

  const restore = useCallback((saved: ReviewFormValues) => setValues(saved), [])

  return { values, errors, setField, toggleGoal, addSkill: addSkillText, removeSkill, validate, setServerErrors, restore }
}
