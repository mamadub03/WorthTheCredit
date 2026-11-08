/**
 * The review form's values, rules, and the JSON it sends. Owner: FE2 (#27).
 *
 * The JSON is BE2's ReviewCreate on main (backend/app/schemas/review.py):
 * exactly these keys, because the API rejects any other. The rules are the
 * product decisions: goals, Worth Score, skills, difficulty, and weekly hours
 * are required; feedback, professor, and semester are optional.
 */
import type { ReviewCreateRequest } from '../../api/reviews.ts'
import type { GoalKey, Score, Term, WeeklyHoursKey } from '../../domain/reviewVocabulary.ts'

export interface ReviewFormValues {
  courseId: string | null
  goals: GoalKey[]
  worthScore: Score | null
  conceptDifficulty: Score | null
  weeklyHoursRange: WeeklyHoursKey | null
  skillsGained: string[]
  feedback: string
  instructorName: string
  semesterTerm: Term | ''
  semesterYear: string
}

export type ReviewField = keyof ReviewFormValues
export type ReviewErrors = Partial<Record<ReviewField, string>>

export const REVIEW_LIMITS = {
  maxSkills: 10,
  skillLength: 40,
  feedbackLength: 1000,
  instructorLength: 100,
} as const

/** The order fields appear on the page, so the first problem gets focus. */
export const REVIEW_FIELD_ORDER: readonly ReviewField[] = [
  'courseId',
  'goals',
  'worthScore',
  'skillsGained',
  'conceptDifficulty',
  'weeklyHoursRange',
  'feedback',
  'instructorName',
  'semesterTerm',
  'semesterYear',
]

/** API field names in a 422 response, to the form field that shows the message. */
export const API_FIELD_TO_FORM: Readonly<Record<string, ReviewField>> = {
  goals: 'goals',
  worth_score: 'worthScore',
  concept_difficulty: 'conceptDifficulty',
  weekly_hours_range: 'weeklyHoursRange',
  skills_gained: 'skillsGained',
  feedback: 'feedback',
  instructor_name: 'instructorName',
  semester: 'semesterTerm',
}

/** The DOM id of a question's container, for focusing the first problem. */
export function reviewFieldId(field: ReviewField): string {
  return `review-${field}`
}

export function emptyReview(courseId: string | null = null): ReviewFormValues {
  return {
    courseId,
    goals: [],
    worthScore: null,
    conceptDifficulty: null,
    weeklyHoursRange: null,
    skillsGained: [],
    feedback: '',
    instructorName: '',
    semesterTerm: '',
    semesterYear: '',
  }
}

/** This year and the five before it, newest first. */
export function semesterYears(now: Date = new Date(), count = 6): string[] {
  const year = now.getFullYear()
  return Array.from({ length: count }, (_, index) => String(year - index))
}

export function validateReview(values: ReviewFormValues): ReviewErrors {
  const errors: ReviewErrors = {}
  if (!values.courseId) errors.courseId = 'Pick the course you took.'
  if (values.goals.length === 0) errors.goals = 'Pick at least one goal.'
  if (values.worthScore === null) errors.worthScore = 'Rate how well the course met your goals.'
  if (values.skillsGained.length === 0) errors.skillsGained = 'Add at least one skill or topic you gained.'
  if (values.conceptDifficulty === null) errors.conceptDifficulty = 'Rate how hard the concepts were.'
  if (values.weeklyHoursRange === null) errors.weeklyHoursRange = 'Pick your weekly hours.'
  if (values.feedback.trim().length > REVIEW_LIMITS.feedbackLength) {
    errors.feedback = `Keep it under ${REVIEW_LIMITS.feedbackLength.toLocaleString('en-US')} characters.`
  }
  if (values.instructorName.trim().length > REVIEW_LIMITS.instructorLength) {
    errors.instructorName = `Keep it under ${REVIEW_LIMITS.instructorLength} characters.`
  }
  if (Boolean(values.semesterTerm) !== Boolean(values.semesterYear)) {
    errors.semesterTerm = 'Pick both a term and a year, or leave both blank.'
  }
  return errors
}

export function normalizeSkill(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

/** Adds one skill, or says why it can't. Empty text is neither added nor an error. */
export function addSkill(skills: readonly string[], text: string): { skills: string[]; error: string | null } {
  const skill = normalizeSkill(text)
  if (!skill) return { skills: [...skills], error: null }
  if (skill.length > REVIEW_LIMITS.skillLength) {
    return { skills: [...skills], error: `Keep each skill under ${REVIEW_LIMITS.skillLength} characters.` }
  }
  if (skills.some((existing) => existing.toLowerCase() === skill.toLowerCase())) {
    return { skills: [...skills], error: `"${skill}" is already on the list.` }
  }
  if (skills.length >= REVIEW_LIMITS.maxSkills) {
    return { skills: [...skills], error: `You can add up to ${REVIEW_LIMITS.maxSkills} skills.` }
  }
  return { skills: [...skills, skill], error: null }
}

export interface ValidReview {
  courseId: string
  body: ReviewCreateRequest
}

/** The agreed JSON for POST /courses/{course_id}/reviews. Call it only once validateReview() finds nothing. */
export function toReviewRequest(values: ReviewFormValues): ValidReview {
  if (!values.courseId || values.worthScore === null || values.conceptDifficulty === null || values.weeklyHoursRange === null) {
    throw new Error('toReviewRequest() needs a valid form')
  }
  const text = (value: string) => value.trim() || null
  return {
    courseId: values.courseId,
    body: {
      goals: values.goals,
      worth_score: values.worthScore,
      concept_difficulty: values.conceptDifficulty,
      weekly_hours_range: values.weeklyHoursRange,
      skills_gained: values.skillsGained,
      feedback: text(values.feedback),
      instructor_name: text(values.instructorName),
      semester: values.semesterTerm && values.semesterYear ? `${values.semesterTerm} ${values.semesterYear}` : null,
    },
  }
}
