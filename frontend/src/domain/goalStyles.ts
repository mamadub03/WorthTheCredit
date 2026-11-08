/**
 * How FE1's pages show each review goal: a short label for cards and chips,
 * and the tint the design gives it. Keys come from reviewVocabulary.ts (FE2).
 * Owner: FE1 (#20, #22).
 */
import { GOALS, type GoalKey } from './reviewVocabulary.ts'
import type { Tint } from './colleges.ts'

export const GOAL_STYLE: Record<GoalKey, { short: string; tint: Tint }> = {
  career_preparation: { short: 'Career prep', tint: 'peach' },
  skill_development: { short: 'Skill building', tint: 'teal' },
  academic_development: { short: 'Big ideas', tint: 'lilac' },
  degree_requirements: { short: 'Degree requirement', tint: 'butter' },
  personal_exploration: { short: 'Just curious', tint: 'mint' },
}

export const GOAL_KEYS: readonly GoalKey[] = GOALS.map((goal) => goal.key)

/** Background and text color for a tint, as CSS variables. */
export function tintColors(tint: Tint): { bg: string; fg: string } {
  return { bg: `var(--wtc-${tint})`, fg: `var(--wtc-${tint}-ink)` }
}

/** "6-10" → "6–10", for "6–10h/wk". */
export function hoursShort(range: string): string {
  return range.replace('-', '–')
}
