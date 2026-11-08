/**
 * The personalization form's values, rules, and the JSON it sends.
 * Owner: FE2 (#29).
 *
 * The JSON is BE2's RecommendationRequest on main
 * (backend/app/schemas/recommendation.py): exactly these five keys, and at
 * least one preference. Personal-development interests go in `interests`,
 * since the contract has no separate field for them.
 */
import type { RecommendationRequest } from '../../api/recommendations.ts'

export interface ProfileFormValues {
  major: string
  interests: string[]
  skills: string[]
  careerGoals: string
  academicGoals: string
  /** Ephemeral paste — used for matching; not written to backend storage. */
  resumeText: string
}

export type ProfileField = keyof ProfileFormValues
export type ProfileErrors = Partial<Record<ProfileField | 'form', string>>

export const PROFILE_LIMITS = {
  maxTags: 10,
  tagLength: 40,
  majorLength: 100,
  goalsLength: 500,
  resumeLength: 8000,
} as const

export function emptyProfile(): ProfileFormValues {
  return { major: '', interests: [], skills: [], careerGoals: '', academicGoals: '', resumeText: '' }
}

export function hasPreference(values: ProfileFormValues): boolean {
  return Boolean(
    values.major.trim() ||
      values.careerGoals.trim() ||
      values.academicGoals.trim() ||
      values.resumeText.trim() ||
      values.interests.length ||
      values.skills.length,
  )
}

export function validateProfile(values: ProfileFormValues): ProfileErrors {
  const errors: ProfileErrors = {}
  if (values.major.trim().length > PROFILE_LIMITS.majorLength) {
    errors.major = `Keep it under ${PROFILE_LIMITS.majorLength} characters.`
  }
  if (values.careerGoals.trim().length > PROFILE_LIMITS.goalsLength) {
    errors.careerGoals = `Keep it under ${PROFILE_LIMITS.goalsLength} characters.`
  }
  if (values.academicGoals.trim().length > PROFILE_LIMITS.goalsLength) {
    errors.academicGoals = `Keep it under ${PROFILE_LIMITS.goalsLength} characters.`
  }
  if (values.resumeText.trim().length > PROFILE_LIMITS.resumeLength) {
    errors.resumeText = `Keep the resume paste under ${PROFILE_LIMITS.resumeLength} characters.`
  }
  if (!hasPreference(values)) {
    errors.form = 'Tell us at least one thing: your major, an interest, a skill, a goal, or paste resume text.'
  }
  return errors
}

/** Adds one tag, or says why it can't. Empty text is neither added nor an error. */
export function addTag(tags: readonly string[], text: string): { tags: string[]; error: string | null } {
  const tag = text.trim().replace(/\s+/g, ' ')
  if (!tag) return { tags: [...tags], error: null }
  if (tag.length > PROFILE_LIMITS.tagLength) return { tags: [...tags], error: `Keep each one under ${PROFILE_LIMITS.tagLength} characters.` }
  if (tags.some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
    return { tags: [...tags], error: `"${tag}" is already on the list.` }
  }
  if (tags.length >= PROFILE_LIMITS.maxTags) return { tags: [...tags], error: `You can add up to ${PROFILE_LIMITS.maxTags}.` }
  return { tags: [...tags, tag], error: null }
}

/** The agreed JSON for POST /recommendations. */
export function toRecommendationRequest(values: ProfileFormValues): RecommendationRequest {
  const text = (value: string) => value.trim() || null
  return {
    major: text(values.major),
    interests: values.interests,
    skills: values.skills,
    career_goals: text(values.careerGoals),
    academic_goals: text(values.academicGoals),
    resume_text: text(values.resumeText),
  }
}
