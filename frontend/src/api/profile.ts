/**
 * The student's saved profile (GET and PUT /profile in BE2's contract), used to
 * prefill the personalization form and as the default input for recommendations.
 * Owner: FE2 (#29, #31).
 */
import { z } from 'zod'
import type { ApiClient } from './client.ts'
import { ApiError } from './errors.ts'

const tags = z
  .array(z.string())
  .nullish()
  .transform((list) => list ?? [])

export const profileSchema = z
  .object({
    major: z.string(),
    interests: tags,
    skills: tags,
    career_goals: z.string().nullish(),
    personal_interests: tags,
    degree_requirements: z.string().nullish(),
    updated_at: z.string().nullish(),
  })
  .transform((profile) => ({
    major: profile.major,
    interests: profile.interests,
    skills: profile.skills,
    careerGoals: profile.career_goals ?? null,
    personalInterests: profile.personal_interests,
    degreeRequirements: profile.degree_requirements ?? null,
    updatedAt: profile.updated_at ?? null,
  }))

export type Profile = z.output<typeof profileSchema>

/** The body PUT /profile takes, and the `profile` inside a recommendation request. */
export interface ProfileRequest {
  major: string
  interests: string[]
  skills: string[]
  career_goals: string | null
  personal_interests: string[]
  degree_requirements: string | null
}

/** The saved profile, or null if the student hasn't saved one yet. */
export async function getProfile(client: ApiClient, signal?: AbortSignal): Promise<Profile | null> {
  try {
    return await client.request('/profile', { auth: true, schema: profileSchema, signal })
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

/** Creates or replaces the saved profile. */
export function saveProfile(client: ApiClient, profile: ProfileRequest, signal?: AbortSignal): Promise<Profile> {
  return client.request('/profile', { method: 'PUT', body: profile, auth: true, schema: profileSchema, signal })
}
