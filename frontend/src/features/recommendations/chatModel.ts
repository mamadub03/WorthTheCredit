/**
 * The AI match conversation: what each turn shows and what it asks the API.
 * Owner: FE2 (#31).
 *
 * Main's RecommendationRequest has no free-text field, though the product
 * decisions list "ask queries on what they want" in the MVP. Until BE2 adds
 * one, anything the student types rides along in academic_goals, labelled
 * "Student's request:", after their own academic goals.
 */
import { ApiError } from '../../api/errors.ts'
import type { RecommendationRequest, RecommendationResult } from '../../api/recommendations.ts'
import { toRecommendationRequest, type ProfileFormValues } from './profileFormModel.ts'

export const GREETING =
  'Hi! Tell me your major, what you’re into, skills you already have, and where you want to end up. I’ll suggest real RIT courses and tell you what students said about them.'

/** The phone board's shorter opening line. */
export const GREETING_SHORT = 'Hi! Tell me your major, skills, and where you want to end up.'

export const FOLLOW_UPS = ['Something lighter', 'More hands-on projects', 'Less math', 'Better for my career goal'] as const

export type ExchangeState =
  | { status: 'loading' }
  | { status: 'done'; result: RecommendationResult }
  | { status: 'failed'; message: string; code: string }

export interface Exchange {
  id: string
  /** What the student said, shown in their bubble. */
  said: string
  request: RecommendationRequest
  state: ExchangeState
}

function list(items: readonly string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/** A first-person summary of the "About you" card, for the student's first chat bubble. */
export function profileSentence(profile: ProfileFormValues): string {
  const parts: string[] = []
  const major = profile.major.trim()
  if (major) parts.push(`I'm ${/^[aeiou]/i.test(major) ? 'an' : 'a'} ${major} major.`)
  if (profile.skills.length) parts.push(`I know ${list(profile.skills)}.`)
  if (profile.interests.length) parts.push(`I'm into ${list(profile.interests)}.`)
  if (profile.careerGoals.trim()) parts.push(`Career goal: ${profile.careerGoals.trim().replace(/\.$/, '')}.`)
  if (profile.academicGoals.trim()) parts.push(profile.academicGoals.trim())
  return parts.join(' ') || 'Find me a course.'
}

/** The request for one turn: the profile, plus anything typed in the chat. */
export function requestFor(profile: ProfileFormValues, typed: string | null): RecommendationRequest {
  const base = toRecommendationRequest(profile)
  const extra = typed?.trim()
  if (!extra) return base
  return { ...base, academic_goals: [base.academic_goals, `Student's request: ${extra}`].filter(Boolean).join('\n') }
}

/** What the advisor says when a turn fails. */
export function failureMessage(error: ApiError): string {
  if (error.status === 401 || error.code === 'not_authenticated') return 'Your sign-in expired. Sign in again to keep going.'
  if (error.status === 422) return 'Tell me a bit more first: your major, an interest, a skill, or a goal.'
  if (error.status === 429 || error.code === 'rate_limited') return "That's a lot of questions at once. Give me a minute and try again."
  if (error.code === 'timeout') return 'That took too long. Try again.'
  if (error.code === 'network_error') return "I can't reach the server. Check your connection and try again."
  if (error.status >= 500 || ['recommendation_failed', 'gemini_not_configured', 'ai_unavailable'].includes(error.code)) {
    return "I couldn't reach Gemini just now. Try again in a moment."
  }
  return error.message
}
