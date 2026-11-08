/**
 * Review vocabulary shared by FE1 (review display) and FE2 (review form).
 *
 * Keys follow BE2's contract (worththecredit-api/docs/api-contract.md on the
 * BackPart2 branch). The backend pair is still reconciling it with
 * docs/DATABASE_SCHEMA.md; if the final keys change, this is the one file to
 * edit. Labels are UI copy, so edit them freely.
 * Owner: FE2 (#25). See docs/frontend-coordination.md section 7.
 */

export const GOALS = [
  { key: 'career_preparation', label: 'Career preparation' },
  { key: 'skill_development', label: 'Specific skill development' },
  { key: 'academic_development', label: 'Academic or intellectual development' },
  { key: 'degree_requirement', label: 'Degree requirement fulfillment' },
  { key: 'personal_exploration', label: 'Personal exploration' },
] as const
export type GoalKey = (typeof GOALS)[number]['key']
export const GOALS_QUESTION = 'What did you hope to gain?'

export const WEEKLY_HOURS = [
  { key: '0-3', label: '0 to 3 hours' },
  { key: '4-6', label: '4 to 6 hours' },
  { key: '7-9', label: '7 to 9 hours' },
  { key: '10-12', label: '10 to 12 hours' },
  { key: '13+', label: '13+ hours' },
] as const
export type WeeklyHoursKey = (typeof WEEKLY_HOURS)[number]['key']
export const WEEKLY_HOURS_QUESTION = 'Hours per week outside class'

export const SCORES = [1, 2, 3, 4, 5] as const
export type Score = (typeof SCORES)[number]

export const WORTH_SCORE_QUESTION = 'How well did the course help you achieve those goals?'
export const WORTH_SCORE_LABELS: Record<Score, string> = {
  1: 'Not at all',
  2: 'A little',
  3: 'Somewhat',
  4: 'Mostly',
  5: 'Completely',
}

export const DIFFICULTY_QUESTION = 'How hard were the concepts to understand?'
export const DIFFICULTY_HINT = 'Rate the material itself, not the professor, grading, or workload.'
export const DIFFICULTY_LABELS: Record<Score, string> = {
  1: 'Very easy',
  2: 'Easy',
  3: 'Moderate',
  4: 'Hard',
  5: 'Very hard',
}

export const TERMS = ['Fall', 'Spring', 'Summer'] as const
export type Term = (typeof TERMS)[number]

export const MATCH_LEVELS = [
  { key: 'strong', label: 'Strong match' },
  { key: 'moderate', label: 'Moderate match' },
  { key: 'limited', label: 'Limited match' },
] as const
export type MatchLevel = (typeof MATCH_LEVELS)[number]['key']

const goalKeys: ReadonlySet<string> = new Set(GOALS.map((goal) => goal.key))
const hoursKeys: ReadonlySet<string> = new Set(WEEKLY_HOURS.map((hours) => hours.key))

export function isGoalKey(value: string): value is GoalKey {
  return goalKeys.has(value)
}

export function isWeeklyHoursKey(value: string): value is WeeklyHoursKey {
  return hoursKeys.has(value)
}

export function isScore(value: number): value is Score {
  return Number.isInteger(value) && value >= 1 && value <= 5
}

export function goalLabel(key: string): string {
  return GOALS.find((goal) => goal.key === key)?.label ?? key
}

export function weeklyHoursLabel(key: string): string {
  return WEEKLY_HOURS.find((hours) => hours.key === key)?.label ?? `${key} hours`
}

export function matchLevelLabel(level: MatchLevel): string {
  return MATCH_LEVELS.find((match) => match.key === level)?.label ?? level
}

/** "Strong Match", "strong", or "Strong match" to "strong"; anything else to null. */
export function toMatchLevel(value: string): MatchLevel | null {
  const key = value.trim().toLowerCase().replace(/\s+match$/, '')
  return MATCH_LEVELS.some((match) => match.key === key) ? (key as MatchLevel) : null
}
