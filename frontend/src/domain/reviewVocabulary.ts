/**
 * Review vocabulary shared by FE1 (review display) and FE2 (review form and
 * recommendations).
 *
 * Keys follow the agreed contracts on main: docs/DATABASE_SCHEMA.md and
 * BE2's backend/app/schemas/review.py and recommendation.py (issue #10).
 * If a key changes there, this is the one file to edit. Labels are UI copy.
 * Owner: FE2 (#25). See docs/frontend-coordination.md section 7.
 */

export const GOALS = [
  { key: 'career_preparation', label: 'Career preparation' },
  { key: 'skill_development', label: 'Specific skill development' },
  { key: 'academic_development', label: 'Academic or intellectual development' },
  { key: 'degree_requirements', label: 'Degree requirement fulfillment' },
  { key: 'personal_exploration', label: 'Personal exploration' },
] as const
export type GoalKey = (typeof GOALS)[number]['key']
export const GOALS_QUESTION = 'What did you hope to gain?'

export const WEEKLY_HOURS = [
  { key: '0-3', label: '0 to 3 hours' },
  { key: '3-6', label: '3 to 6 hours' },
  { key: '6-10', label: '6 to 10 hours' },
  { key: '10+', label: '10+ hours' },
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

/** BE2's four descriptive match levels. No percentages anywhere (product decision). */
export const MATCH_LEVELS = [
  { key: 'strong_match', label: 'Strong match' },
  { key: 'good_match', label: 'Good match' },
  { key: 'partial_match', label: 'Partial match' },
  { key: 'exploratory', label: 'Worth exploring' },
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

export function goalLabel(key: string): string {
  return GOALS.find((goal) => goal.key === key)?.label ?? key
}

export function weeklyHoursLabel(key: string): string {
  return WEEKLY_HOURS.find((hours) => hours.key === key)?.label ?? `${key} hours`
}

export function matchLevelLabel(level: MatchLevel): string {
  return MATCH_LEVELS.find((match) => match.key === level)?.label ?? level
}

/** "strong_match", "Strong match", or "strong-match" to "strong_match"; anything else to null. */
export function toMatchLevel(value: string): MatchLevel | null {
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, '_')
  return MATCH_LEVELS.some((match) => match.key === key) ? (key as MatchLevel) : null
}

/** One decimal, the way every page shows a Worth Score or difficulty average. */
export function formatAverage(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1)
}
