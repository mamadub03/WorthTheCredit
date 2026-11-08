import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiClient, type ApiClient, type FetchLike } from '../client.ts'
import { getCourse, searchCourses } from '../courses.ts'
import type { ApiError } from '../errors.ts'
import { getRecommendations, type RecommendationRequest } from '../recommendations.ts'
import { createReview, getWorthScore, type ReviewCreateRequest } from '../reviews.ts'
import { MOCK_COURSES, MOCK_REVIEWS } from './fixtures.ts'
import { createMockApi, userFromAuthorization, type MockApi } from './mockApi.ts'

const BASE = 'http://localhost:8000'
const idOf = (code: string) => MOCK_COURSES.find((course) => course.code === code)!.id
const UNREVIEWED = MOCK_COURSES.find((course) => !MOCK_REVIEWS.some((review) => review.course_id === course.id))!

const review: ReviewCreateRequest = {
  goals: ['career_preparation', 'skill_development'],
  worth_score: 4,
  concept_difficulty: 3,
  weekly_hours_range: '6-10',
  skills_gained: [' Java ', 'Data structures'],
  feedback: '   ',
  instructor_name: 'Prof. Example',
  semester: 'Fall 2025',
}

const profile: RecommendationRequest = {
  major: 'Software Engineering',
  interests: ['machine learning', 'data'],
  skills: ['Python'],
  career_goals: 'ML engineer',
  academic_goals: null,
  resume_text: null,
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
  it('map to students', () => {
    expect(userFromAuthorization('Bearer dev:alice')).toEqual({ sub: 'dev|alice', verified: true })
    expect(userFromAuthorization('Bearer dev-unverified')).toEqual({ sub: 'dev|unverified', verified: false })
    expect(userFromAuthorization(null)).toBeNull()
  })
})

describe('courses', () => {
  it('searches like BE1: envelope, code order, filters', async () => {
    const all = await searchCourses(clientAs(null), {})
    expect(all.total).toBe(MOCK_COURSES.length)
    expect(all.results.map((course) => course.code)).toEqual([...all.results.map((course) => course.code)].sort())
    expect((await searchCourses(clientAs(null), { q: 'machine learning' })).results.map((course) => course.code)).toEqual(['CSCI-331'])
    expect((await searchCourses(clientAs(null), { code: 'swen' })).results.map((course) => course.code)).toEqual(['SWEN-261'])
    expect((await searchCourses(clientAs(null), { department: 'csci' })).total).toBe(2)
  })

  it('returns details with aggregates, null while unreviewed', async () => {
    expect(await getCourse(clientAs(null), idOf('SWEN-261'))).toMatchObject({ code: 'SWEN-261', worthScore: 4, reviewCount: 4 })
    expect(await getCourse(clientAs(null), UNREVIEWED.id)).toMatchObject({ worthScore: null, reviewCount: 0, averageDifficulty: null })
  })

  it('answers 404 for an unknown id and 422 for one that is not a UUID', async () => {
    const missing = await failure(getCourse(clientAs(null), 'c0a5e000-0000-4000-8000-999999999999'))
    expect(missing.status).toBe(404)
    expect(missing.message).toBe('Course not found')
    expect((await failure(getCourse(clientAs(null), 'SWEN-261'))).code).toBe('validation_error')
  })
})

describe('reviews', () => {
  it('creates a review and cleans it the way ReviewCreate does', async () => {
    const created = await createReview(clientAs('dev:alice'), idOf('GCIS-124'), review)
    expect(created).toMatchObject({ courseId: idOf('GCIS-124'), skillsGained: ['Java', 'Data structures'], feedback: null, semester: 'Fall 2025' })
    expect(await getWorthScore(clientAs(null), idOf('GCIS-124'))).toMatchObject({ worthScore: 4, reviewCount: 1, workload: { '6-10': 1 } })
  })

  it('allows one review per student per course', async () => {
    await createReview(clientAs('dev:alice'), idOf('GCIS-124'), review)
    const duplicate = await failure(createReview(clientAs('dev:alice'), idOf('GCIS-124'), review))
    expect(duplicate.status).toBe(409)
    await expect(createReview(clientAs('dev:bob'), idOf('GCIS-124'), review)).resolves.toBeTruthy()
  })

  it('needs a verified email and a token', async () => {
    expect((await failure(createReview(clientAs('dev-unverified'), idOf('GCIS-124'), review))).status).toBe(403)
    const response = await mock.fetch(`${BASE}/courses/${idOf('GCIS-124')}/reviews`, { method: 'POST', body: JSON.stringify(review) })
    expect(response.status).toBe(401)
  })

  it('answers 404 for an unknown course', async () => {
    expect((await failure(createReview(clientAs('dev:alice'), 'c0a5e000-0000-4000-8000-999999999999', review))).status).toBe(404)
  })

  it('answers 422 with field errors like FastAPI, including keys the contract forbids', async () => {
    const error = await failure(
      createReview(clientAs('dev:alice'), idOf('GCIS-124'), {
        ...review,
        goals: [],
        worth_score: 9,
        weekly_hours_range: '4-7' as ReviewCreateRequest['weekly_hours_range'],
        semester: 'An extremely long semester name that runs past thirty characters',
        course_code: 'GCIS-124',
      } as ReviewCreateRequest),
    )
    expect(error.code).toBe('validation_error')
    expect(Object.keys(error.fieldErrors).sort()).toEqual(['course_code', 'goals', 'semester', 'weekly_hours_range', 'worth_score'])
  })

  it('keeps workload counts in step with the review count', async () => {
    const summary = await getWorthScore(clientAs(null), idOf('SWEN-261'))
    expect(Object.values(summary.workload).reduce((sum, count) => sum + count, 0)).toBe(summary.reviewCount)
  })
})

describe('recommendations', () => {
  it('needs at least one preference', async () => {
    const error = await failure(
      getRecommendations(clientAs('dev:erin'), {
        major: ' ',
        interests: [],
        skills: [],
        career_goals: null,
        academic_goals: null,
        resume_text: null,
      }),
    )
    expect(error.code).toBe('validation_error')
    expect(error.fieldErrors._form).toMatch(/Provide a major/)
  })

  it('recommends only real courses, with database numbers', async () => {
    const result = await getRecommendations(clientAs('dev:erin'), profile)
    const ids = new Set(MOCK_COURSES.map((course) => course.id))
    expect(result.items.length).toBeGreaterThan(0)
    expect(result.items.length).toBeLessThanOrEqual(5)
    expect(result.droppedCount).toBe(0)
    expect(result.items[0].course.code).toMatch(/^CSCI-/)
    for (const item of result.items) {
      expect(ids.has(item.course.id)).toBe(true)
      expect(item.worthScore === null).toBe(item.reviewCount === 0)
    }
  })
})

describe('routing', () => {
  it('sends areas that are not mocked to the real server', async () => {
    mock = createMockApi({ baseUrl: BASE, domains: ['reviews'], passthrough, latencyMs: 0, storage: null })
    const response = await mock.fetch(`${BASE}/courses`, { method: 'GET' })
    expect(await response.json()).toEqual({ from: 'server' })
    expect(passthrough).toHaveBeenCalledOnce()
  })

  it('honours an aborted signal like a real fetch', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(mock.fetch(`${BASE}/courses`, { signal: controller.signal })).rejects.toThrow(/aborted/)
  })
})
