/**
 * Personalization form state. The answers are remembered per student in this
 * browser (main's API has no saved-profile endpoint), and logout clears them.
 * Owner: FE2 (#29).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { RecommendationRequest } from '../../api/recommendations.ts'
import { readStored, userKey, writeStored } from '../auth/appStorage.ts'
import {
  addTag,
  emptyProfile,
  toRecommendationRequest,
  validateProfile,
  type ProfileErrors,
  type ProfileField,
  type ProfileFormValues,
} from './profileFormModel.ts'

type TagField = 'interests' | 'skills'

export interface ProfileFormState {
  values: ProfileFormValues
  errors: ProfileErrors
  setText(field: 'major' | 'careerGoals' | 'academicGoals', value: string): void
  /** Returns true when the tag box should clear. */
  addTag(field: TagField, text: string): boolean
  removeTag(field: TagField, tag: string): void
  validate(): { ok: true; request: RecommendationRequest } | { ok: false }
}

export function profileKey(sub: string): string {
  return userKey(sub, 'profile')
}

/** The page renders behind RequireAuth, so the student is known on the first render. */
function savedProfile(sub: string | null): ProfileFormValues {
  const saved = sub ? readStored<ProfileFormValues>(profileKey(sub), 'local') : null
  return saved && Array.isArray(saved.interests) && Array.isArray(saved.skills) ? { ...emptyProfile(), ...saved } : emptyProfile()
}

export function useProfileForm(sub: string | null): ProfileFormState {
  const [values, setValues] = useState<ProfileFormValues>(() => savedProfile(sub))
  const [attempted, setAttempted] = useState(false)
  const [tagErrors, setTagErrors] = useState<Partial<Record<TagField, string>>>({})

  useEffect(() => {
    if (sub) writeStored(profileKey(sub), values, 'local')
  }, [sub, values])

  const problems = useMemo(() => validateProfile(values), [values])

  const errors = useMemo(() => {
    const visible: ProfileErrors = {}
    for (const field of ['major', 'careerGoals', 'academicGoals'] as const) {
      if (problems[field]) visible[field] = problems[field]
    }
    if (attempted && problems.form) visible.form = problems.form
    for (const field of ['interests', 'skills'] as const) {
      if (tagErrors[field]) visible[field] = tagErrors[field]
    }
    return visible
  }, [problems, attempted, tagErrors])

  const setText = useCallback((field: 'major' | 'careerGoals' | 'academicGoals', value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
  }, [])

  const addTagText = useCallback(
    (field: TagField, text: string) => {
      const result = addTag(values[field], text)
      setTagErrors((current) => ({ ...current, [field]: result.error ?? undefined }))
      if (result.error) return false
      if (result.tags.length !== values[field].length) setValues((current) => ({ ...current, [field]: result.tags }))
      return true
    },
    [values],
  )

  const removeTag = useCallback((field: TagField, tag: string) => {
    setTagErrors((current) => ({ ...current, [field]: undefined }))
    setValues((current) => ({ ...current, [field]: current[field].filter((item) => item !== tag) }))
  }, [])

  const validate = useCallback((): { ok: true; request: RecommendationRequest } | { ok: false } => {
    setAttempted(true)
    const found = validateProfile(values)
    const blocking = (Object.keys(found) as (ProfileField | 'form')[]).length > 0
    return blocking ? { ok: false } : { ok: true, request: toRecommendationRequest(values) }
  }, [values])

  return { values, errors, setText, addTag: addTagText, removeTag, validate }
}
