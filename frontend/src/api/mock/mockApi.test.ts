import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiClient, type ApiClient, type FetchLike } from '../client.ts'
import type { ApiError } from '../errors.ts'
import { getProfile, saveProfile } from '../profile.ts'
import { getRecommendations } from '../recommendations.ts'
import { createReview, getMyReview, type ReviewCreateRequest } from '../reviews.ts'
import { getCourse } from '../courses.ts'
import { MOCK_COURSES, MOCK_REVIEWS } from './fixtures.ts'
import { createMockApi, userFromAuthorization, type MockApi } from './mockApi.ts'

const BASE = 'http://localhost:8000'

const review: ReviewCreateRequest = {
  course_code: 'gcis124',
  goals: ['career_preparation', 'skill_development'],
  worth_score: 4,
  skills: ['Java', '  data   structures ', 'java'],
  difficulty: 3,
  weekly_hours: '7-9',
  feedback: '   ',
  professor: 'Prof. Example',
  semester: 'fall 2025',
}

let mock: MockApi
let passthrough: ReturnType<typeof vi.fn<FetchLike>>

function clientAs(token: string | null): ApiClient {
  return createApiClient({ baseUrl: BASE, fetch: mock.fetch, getAccessToken: async () => token })
}

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (error) {
    return error as ApiError
  }
  throw new Error('expected the request to fail')
}

beforeEach(() => {
  passthrough = vi.fn<FetchLike>(async () => new Response('{"from":"server"}', { status: 200 }))
  mock = createMockApi({ baseUrl: BASE, passthrough, latencyMs: 0, recommendationLatencyMs: 0, storage: null })
})

describe('dev tokens', () => {
  it("follow BE2's DEV_AUTH_BYPASS rules", () => {
    expect(userFromAuthorization('Bearer dev:alice')).toEqual({ sub: 'dev|alice', verified: true })
    expect(userFromAuthorization('Bearer dev-unverified')).toEqual({ sub: 'dev|unverified', verified: false })
    expect(userFromAuthorization('Bearer anything')).toEqual({ sub: 'dev|local-user', verified: true })
    expect(userFromAuthorization(null)).toBeNull()
  })
})

describe('reviews', () => {
  it("creates a review and normalizes it the way BE2 does", async () => {
    const created = await createReview(clientAs('dev:alice'), review)
    expect(created).toMatchObject({
      courseCode: 'GCIS-124',
      skills: ['Java', 'data structures'],
      feedback: null,
      semester: 'Fall 2025',
      worthScore: 4,
    })
  })

  it('allows one review per student per course', async () => {
    await createReview(clientAs('dev:alice'), review)
    expect((await failure(createReview(clientAs('dev:alice'), review))).code).toBe('already_reviewed')
    await expect(createReview(clientAs('dev:bob'), review)).resolves.toBeTruthy()
  })

  it('needs a verified email', async () => {
    const error = await failure(createReview(clientAs('dev-unverified'), review))
    expect(error.status).toBe(403)
    expect(error.code).toBe('email_not_verified')
  })

  it('answers 401 without a token', async () => {
    const response = await mock.fetch(`${BASE}/reviews`, { method: 'POST', body: JSON.stringify(review) })
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ detail: 'not_authenticated' })
  })

  it('answers 404 for an unknown course', async () => {
    expect((await failure(createReview(clientAs('dev:alice'), { ...review, course_code: 'NOPE-999' }))).code).toBe('course_not_found')
  })

  it('answers 422 with field errors like FastAPI', async () => {
    const error = await failure(
      createReview(clientAs('dev:alice'), {
        ...review,
        goals: [],
        worth_score: 9,
        weekly_hours: '4-7' as ReviewCreateRequest['weekly_hours'],
        semester: 'Winter 2025',
      }),
    )
    expect(error.code).toBe('validation_error')
    expect(Object.keys(error.fieldErrors).sort()).toEqual(['goals', 'semester', 'weekly_hours', 'worth_score'])
  })

  it('reports whether the student already reviewed a course', async () => {
    const client = clientAs('dev:alice')
    expect(await getMyReview(client, 'GCIS-124')).toMatchObject({ hasReviewed: false, review: null })
    await createReview(client, review)
    expect(await getMyReview(client, 'gcis-124')).toMatchObject({ courseCode: 'GCIS-124', hasReviewed: true })
  })
})

describe('courses and stats', () => {
  it('returns course details with stats', async () => {
    const course = await getCourse(clientAs(null), 'swen261')
    expect(course).toMatchObject({ code: 'SWEN-261', title: 'Introduction to Software Engineering', credits: 3 })
  })

  it('computes stats like BE2: null score with no reviews, distribution adds up', async () => {
    const unreviewed = MOCK_COURSES.find((course) => !MOCK_REVIEWS.some((item) => item.course_code === course.course_code))
    expect(unreviewed).toBeDefined()
    const empty = await (await mock.fetch(`${BASE}/courses/${unreviewed!.course_code}/stats`, {})).json()
    expect(empty).toMatchObject({ review_count: 0, worth_score: null, difficulty_avg: null, low_data: true, workload_summary: 'No workload reports yet' })

    const stats = await (await mock.fetch(`${BASE}/courses/SWEN-261/stats`, {})).json()
    const total = Object.values(stats.workload_distribution as Record<string, number>).reduce((sum, value) => sum + value, 0)
    expect(total).toBe(stats.review_count)
    expect(stats.worth_score).toBe(4)
    expect(stats.low_data).toBe(false)
  })
})

describe('profile and recommendations', () => {
  it('has no profile until one is saved', async () => {
    const client = clientAs('dev:carol')
    expect(await getProfile(client)).toBeNull()
    await saveProfile(client, {
      major: 'Software Engineering',
      interests: ['machine learning'],
      skills: ['Python'],
      career_goals: 'ML engineer',
      personal_interests: [],
      degree_requirements: null,
    })
    expect(await getProfile(client)).toMatchObject({ major: 'Software Engineering', interests: ['machine learning'] })
  })

  it('needs a profile, inline or saved', async () => {
    expect((await failure(getRecommendations(clientAs('dev:dave'), {}))).code).toBe('profile_required')
  })

  it('recommends only real courses, with database numbers and the prerequisites note', async () => {
    const result = await getRecommendations(clientAs('dev:erin'), {
      profile: {
        major: 'Software Engineering',
        interests: ['machine learning', 'data'],
        skills: ['Python'],
        career_goals: 'ML engineer',
        personal_interests: [],
        degree_requirements: null,
      },
      query: 'hands-on ML',
    })
    const codes = new Set(MOCK_COURSES.map((course) => course.course_code))
    expect(result.items.length).toBeGreaterThan(0)
    expect(result.items.length).toBeLessThanOrEqual(6)
    expect(result.droppedCount).toBe(0)
    for (const item of result.items) {
      expect(codes.has(item.courseCode)).toBe(true)
      expect(item.limitations.at(-1)).toMatch(/^Prerequisites not verified/)
      if (item.reviewCount === 0) {
        expect(item.studentInsights).toEqual([])
        expect(item.worthScore).toBeNull()
      }
    }
    expect(result.items[0].courseCode).toMatch(/^CSCI-/)
  })
})

describe('routing', () => {
  it('sends areas that are not mocked to the real server', async () => {
    mock = createMockApi({ baseUrl: BASE, domains: ['reviews'], passthrough, latencyMs: 0, storage: null })
    const response = await mock.fetch(`${BASE}/courses/SWEN-261`, { method: 'GET' })
    expect(await response.json()).toEqual({ from: 'server' })
    expect(passthrough).toHaveBeenCalledOnce()
  })

  it('honours an aborted signal like a real fetch', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(mock.fetch(`${BASE}/courses`, { signal: controller.signal })).rejects.toThrow(/aborted/)
  })
})
