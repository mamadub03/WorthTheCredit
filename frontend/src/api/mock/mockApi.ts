/**
 * In-browser stand-in for the API, shaped like the contracts on main: BE1's
 * live course routes (backend/app/api/routes/courses.py) and BE2's planned
 * review and recommendation endpoints (backend/app/schemas/review.py and
 * recommendation.py, issue #10). Owner: FE2 (#25).
 *
 * VITE_API_MOCKS picks which areas it answers; everything else goes to the
 * real server. It returns sample data only, and DemoDataBanner says so.
 *
 * Sign-in: a request with no bearer token gets 401; the dev token
 * "dev-unverified" gets 403 on review submission; "dev:<name>" is a verified
 * student named <name>. Error details use code strings ("already_reviewed");
 * the app keys off the status code either way.
 */
import type { AppEnv, MockDomain } from '../../config/env.ts'
import { GOALS, WEEKLY_HOURS, type GoalKey, type MatchLevel, type WeeklyHoursKey } from '../../domain/reviewVocabulary.ts'
import type { FetchLike } from '../client.ts'
import { MOCK_COURSES, MOCK_REVIEWS, type MockCourse, type MockReview } from './fixtures.ts'

interface MockUser {
  sub: string
  verified: boolean
}

interface MockState {
  /** Reviews created since the page loaded (the seed reviews come from fixtures). */
  reviews: MockReview[]
}

interface Context {
  params: string[]
  query: URLSearchParams
  body: unknown
  user: MockUser | null
}

interface Reply {
  status: number
  body?: unknown
}

interface Issue {
  type: string
  loc: (string | number)[]
  msg: string
  input?: unknown
}

interface Route {
  domain: MockDomain
  method: 'GET' | 'POST'
  pattern: RegExp
  handle: (context: Context) => Reply
}

export interface MockApiOptions {
  baseUrl: string
  domains?: Iterable<MockDomain>
  /** Where requests for areas that aren't mocked go. Defaults to the browser's fetch. */
  passthrough?: FetchLike
  /** Delay before each reply. Recommendations wait longer, like a model call. */
  latencyMs?: number
  recommendationLatencyMs?: number
  /** Keeps created reviews across reloads. Null keeps them in memory only. */
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null
  now?: () => Date
}

export interface MockApi {
  fetch: FetchLike
  /** Forgets every review created since the page loaded. */
  reset(): void
}

const STORAGE_KEY = 'wtc:mock-api:v2'
const ALL_DOMAINS: MockDomain[] = ['courses', 'reviews', 'recommendations']
const HOURS: WeeklyHoursKey[] = WEEKLY_HOURS.map((hours) => hours.key)
const GOAL_KEYS: GoalKey[] = GOALS.map((goal) => goal.key)
const REVIEW_FIELDS = new Set(['goals', 'worth_score', 'concept_difficulty', 'weekly_hours_range', 'skills_gained', 'feedback', 'instructor_name', 'semester'])
const REQUEST_FIELDS = new Set(['major', 'interests', 'skills', 'career_goals', 'academic_goals'])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const STOP_WORDS = new Set(['with', 'that', 'want', 'something', 'without', 'into', 'about', 'more', 'some', 'like', 'work', 'and', 'the', 'for', 'one', 'need', 'year'])

/** Who a bearer token says the student is (the mock's stand-in for Auth0). */
export function userFromAuthorization(header: string | null): MockUser | null {
  const match = /^Bearer\s+(.+)$/i.exec(header ?? '')
  if (!match) return null
  const token = match[1].trim()
  if (token === 'dev-unverified') return { sub: 'dev|unverified', verified: false }
  const name = token.startsWith('dev:') ? token.slice(4).trim() : ''
  return { sub: `dev|${name || 'local-user'}`, verified: true }
}

export function createMockApi(options: MockApiOptions): MockApi {
  const domains = new Set<MockDomain>(options.domains ?? ALL_DOMAINS)
  const passthrough: FetchLike = options.passthrough ?? ((input, init) => fetch(input, init))
  const now = options.now ?? (() => new Date())
  const storage = options.storage ?? null
  const base = new URL(options.baseUrl)
  const basePath = base.pathname.replace(/\/+$/, '')
  let state = load()

  function load(): MockState {
    try {
      const saved = storage?.getItem(STORAGE_KEY)
      return saved ? { reviews: [], ...(JSON.parse(saved) as Partial<MockState>) } : { reviews: [] }
    } catch {
      return { reviews: [] }
    }
  }

  function save(): void {
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Private mode or a full quota: the mock keeps working in memory.
    }
  }

  const allReviews = (): MockReview[] => [...MOCK_REVIEWS, ...state.reviews]
  const reviewsFor = (id: string): MockReview[] => allReviews().filter((review) => review.course_id === id)
  const findCourse = (id: string): MockCourse | undefined => MOCK_COURSES.find((course) => course.id === id.toLowerCase())

  function aggregates(id: string) {
    const reviews = reviewsFor(id)
    const count = reviews.length
    const workload = Object.fromEntries(HOURS.map((hours) => [hours, 0])) as Record<WeeklyHoursKey, number>
    for (const review of reviews) workload[review.weekly_hours_range] += 1
    return {
      community_worth_score: count ? average(reviews.map((review) => review.worth_score)) : null,
      review_count: count,
      average_concept_difficulty: count ? average(reviews.map((review) => review.concept_difficulty)) : null,
      workload,
    }
  }

  // A course id that isn't a UUID fails FastAPI's path validation; an unknown one is a 404.
  function courseOr404(id: string): MockCourse | Reply {
    if (!UUID.test(id)) {
      return invalid([{ type: 'uuid_parsing', loc: ['path', 'course_id'], msg: 'Input should be a valid UUID', input: id }])
    }
    return findCourse(id) ?? { status: 404, body: { detail: 'Course not found' } }
  }

  function searchCourses({ query }: Context): Reply {
    const text = (query.get('q') ?? '').trim().toLowerCase()
    const code = (query.get('code') ?? '').trim().toLowerCase()
    const department = (query.get('department') ?? '').trim().toLowerCase()
    const limit = clamp(toInt(query.get('limit'), 20), 1, 100)
    const offset = Math.max(0, toInt(query.get('offset'), 0))
    const matches = MOCK_COURSES.filter(
      (course) =>
        (!text || `${course.code} ${course.title} ${course.description}`.toLowerCase().includes(text)) &&
        (!code || course.code.toLowerCase().includes(code)) &&
        (!department || course.department.toLowerCase() === department),
    ).sort((a, b) => a.code.localeCompare(b.code))
    return { status: 200, body: { results: matches.slice(offset, offset + limit).map(summary), total: matches.length, limit, offset } }
  }

  function courseDetail({ params }: Context): Reply {
    const course = courseOr404(params[0])
    if (!('id' in course)) return course
    const { workload: _workload, ...stats } = aggregates(course.id)
    return { status: 200, body: { ...summary(course), ...stats } }
  }

  function worthScore({ params }: Context): Reply {
    const course = courseOr404(params[0])
    if (!('id' in course)) return course
    return { status: 200, body: { course_id: course.id, ...aggregates(course.id) } }
  }

  function listReviews({ params, query }: Context): Reply {
    const course = courseOr404(params[0])
    if (!('id' in course)) return course
    const limit = clamp(toInt(query.get('limit'), 20), 1, 100)
    const offset = Math.max(0, toInt(query.get('offset'), 0))
    const matching = reviewsFor(course.id).sort((a, b) => b.created_at.localeCompare(a.created_at))
    return { status: 200, body: { results: matching.slice(offset, offset + limit).map(publicReview), total: matching.length, limit, offset } }
  }

  function createReview({ params, body, user }: Context): Reply {
    if (!user) return fail(401, 'not_authenticated')
    if (!user.verified) return fail(403, 'email_not_verified')
    const data = asRecord(body)
    const issues: Issue[] = []
    for (const key of Object.keys(data)) {
      if (!REVIEW_FIELDS.has(key)) issues.push({ type: 'extra_forbidden', loc: ['body', key], msg: 'Extra inputs are not permitted', input: data[key] })
    }
    const goals = readGoals(data.goals, issues)
    const worthScore = readScore(data, 'worth_score', issues)
    const difficulty = readScore(data, 'concept_difficulty', issues)
    const hours = typeof data.weekly_hours_range === 'string' && HOURS.includes(data.weekly_hours_range as WeeklyHoursKey)
      ? (data.weekly_hours_range as WeeklyHoursKey)
      : null
    if (!hours) issues.push({ type: 'literal_error', loc: ['body', 'weekly_hours_range'], msg: `Input should be ${quoted(HOURS)}`, input: data.weekly_hours_range })
    const skills = readPhrases(data.skills_gained, 'skills_gained', issues)
    const feedback = readText(data, 'feedback', issues)
    const instructor = readText(data, 'instructor_name', issues)
    const semester = readText(data, 'semester', issues, 30)
    if (issues.length > 0 || goals === null || worthScore === null || difficulty === null || hours === null || skills === null) {
      return invalid(issues)
    }
    const course = courseOr404(params[0])
    if (!('id' in course)) return course
    if (allReviews().some((review) => review.sub === user.sub && review.course_id === course.id)) return fail(409, 'already_reviewed')
    const review: MockReview = {
      id: newId(),
      sub: user.sub,
      course_id: course.id,
      goals,
      worth_score: worthScore,
      concept_difficulty: difficulty,
      weekly_hours_range: hours,
      skills_gained: skills,
      feedback,
      instructor_name: instructor,
      semester,
      created_at: now().toISOString(),
    }
    state.reviews.push(review)
    save()
    return { status: 201, body: publicReview(review) }
  }

  function recommend({ body, user }: Context): Reply {
    if (!user) return fail(401, 'not_authenticated')
    const data = asRecord(body)
    const issues: Issue[] = []
    for (const key of Object.keys(data)) {
      if (!REQUEST_FIELDS.has(key)) issues.push({ type: 'extra_forbidden', loc: ['body', key], msg: 'Extra inputs are not permitted', input: data[key] })
    }
    const major = readText(data, 'major', issues)
    const careerGoals = readText(data, 'career_goals', issues)
    const academicGoals = readText(data, 'academic_goals', issues)
    const interests = readPhrases(data.interests, 'interests', issues) ?? []
    const skills = readPhrases(data.skills, 'skills', issues) ?? []
    if (issues.length === 0 && !major && !careerGoals && !academicGoals && interests.length === 0 && skills.length === 0) {
      issues.push({ type: 'value_error', loc: ['body'], msg: 'Value error, Provide a major, interest, skill, career goal, or academic goal' })
    }
    if (issues.length > 0) return invalid(issues)

    const wanted = [
      ...interests.map((phrase) => ({ phrase, weight: 2 })),
      ...skills.map((phrase) => ({ phrase, weight: 1 })),
      ...keywords(careerGoals).map((phrase) => ({ phrase, weight: 1 })),
      ...keywords(academicGoals).map((phrase) => ({ phrase, weight: 1 })),
      ...keywords(major).map((phrase) => ({ phrase, weight: 0.5 })),
    ]
    const scored = MOCK_COURSES.map((course) => {
      const text = [course.code, course.title, course.description.replace(/DEMO DATA\.?/g, ''), course.department, ...course.tags].join(' ').toLowerCase()
      const matched: string[] = []
      let score = 0
      for (const { phrase, weight } of wanted) {
        const needle = phrase.toLowerCase()
        if (needle.length < 3 || !text.includes(needle)) continue
        score += weight
        if (!matched.some((item) => item.toLowerCase() === needle)) matched.push(phrase)
      }
      return { course, score, matched, stats: aggregates(course.id) }
    })
    const byWorth = (a: (typeof scored)[number], b: (typeof scored)[number]) =>
      (b.stats.community_worth_score ?? 0) - (a.stats.community_worth_score ?? 0)
    const ranked = scored.filter((item) => item.score > 0).sort((a, b) => b.score - a.score || byWorth(a, b))
    const picks = ranked.length > 0 ? ranked.slice(0, 5) : [...scored].sort(byWorth).slice(0, 3)

    return {
      status: 200,
      body: {
        recommendations: picks.map(({ course, score, matched, stats }) => ({
          course: summary(course),
          match_level: matchLevelFor(score),
          explanation: matched.length
            ? `Matches your interest in ${joinList(matched.slice(0, 3).map((item) => item.toLowerCase()))}, and builds skills like ${joinList(course.tags.slice(0, 2).map((tag) => tag.toLowerCase()))}.`
            : `A well-reviewed ${course.department} course that could round out your schedule.`,
          community_worth_score: stats.community_worth_score,
          review_count: stats.review_count,
        })),
      },
    }
  }

  const routes: Route[] = [
    { domain: 'courses', method: 'GET', pattern: /^\/courses$/, handle: searchCourses },
    { domain: 'courses', method: 'GET', pattern: /^\/courses\/([^/]+)$/, handle: courseDetail },
    { domain: 'reviews', method: 'GET', pattern: /^\/courses\/([^/]+)\/worth-score$/, handle: worthScore },
    { domain: 'reviews', method: 'GET', pattern: /^\/courses\/([^/]+)\/reviews$/, handle: listReviews },
    { domain: 'reviews', method: 'POST', pattern: /^\/courses\/([^/]+)\/reviews$/, handle: createReview },
    { domain: 'recommendations', method: 'POST', pattern: /^\/recommendations$/, handle: recommend },
  ]

  async function mockFetch(input: string, init: RequestInit): Promise<Response> {
    const url = new URL(input)
    const method = (init.method ?? 'GET').toUpperCase()
    const underBase =
      url.origin === base.origin && (basePath === '' || url.pathname === basePath || url.pathname.startsWith(`${basePath}/`))
    const path = url.pathname.slice(basePath.length) || '/'
    const route = underBase
      ? routes.find((candidate) => domains.has(candidate.domain) && candidate.method === method && candidate.pattern.test(path))
      : undefined
    if (!route) return passthrough(input, init)

    await wait(route.domain === 'recommendations' ? (options.recommendationLatencyMs ?? 1200) : (options.latencyMs ?? 250), init.signal)

    let body: unknown
    if (typeof init.body === 'string' && init.body !== '') {
      try {
        body = JSON.parse(init.body)
      } catch {
        return respond(invalid([{ type: 'json_invalid', loc: ['body'], msg: 'JSON decode error' }]))
      }
    }
    const params = (route.pattern.exec(path) ?? []).slice(1).map((part) => decodeURIComponent(part))
    const user = userFromAuthorization(new Headers(init.headers).get('Authorization'))
    return respond(route.handle({ params, query: url.searchParams, body, user }))
  }

  return {
    fetch: mockFetch,
    reset() {
      state = { reviews: [] }
      save()
    },
  }
}

let shared: MockApi | null = null

/** One mock per page load, so every hook sees the same reviews. */
export function getMockFetch(appEnv: AppEnv): FetchLike {
  shared ??= createMockApi({ baseUrl: appEnv.apiBaseUrl, domains: appEnv.mockDomains, storage: browserSessionStorage() })
  return shared.fetch
}

function browserSessionStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

function summary(course: MockCourse) {
  const { tags: _tags, ...fields } = course
  return fields
}

function publicReview(review: MockReview) {
  const { sub: _sub, ...rest } = review
  return rest
}

function matchLevelFor(score: number): MatchLevel {
  if (score >= 5) return 'strong_match'
  if (score >= 3) return 'good_match'
  if (score >= 1.5) return 'partial_match'
  return 'exploratory'
}

function readGoals(value: unknown, issues: Issue[]): GoalKey[] | null {
  if (!Array.isArray(value)) {
    issues.push({ type: 'missing', loc: ['body', 'goals'], msg: 'Field required', input: value })
    return null
  }
  const unknownIndex = value.findIndex((goal) => typeof goal !== 'string' || !GOAL_KEYS.includes(goal as GoalKey))
  if (unknownIndex >= 0) {
    issues.push({ type: 'literal_error', loc: ['body', 'goals', unknownIndex], msg: `Input should be ${quoted(GOAL_KEYS)}`, input: value[unknownIndex] })
    return null
  }
  if (value.length < 1) {
    issues.push({ type: 'too_short', loc: ['body', 'goals'], msg: 'List should have at least 1 item after validation, not 0', input: value })
    return null
  }
  if (new Set(value).size !== value.length) {
    issues.push({ type: 'value_error', loc: ['body', 'goals'], msg: 'Value error, goals must list each category at most once', input: value })
    return null
  }
  return value as GoalKey[]
}

function readScore(data: Record<string, unknown>, field: string, issues: Issue[]): number | null {
  const value = data[field]
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    issues.push({ type: 'int_type', loc: ['body', field], msg: 'Input should be a valid integer', input: value })
    return null
  }
  if (value < 1 || value > 5) {
    const tooLow = value < 1
    issues.push({
      type: tooLow ? 'greater_than_equal' : 'less_than_equal',
      loc: ['body', field],
      msg: `Input should be ${tooLow ? 'greater than or equal to 1' : 'less than or equal to 5'}`,
      input: value,
    })
    return null
  }
  return value
}

function readPhrases(value: unknown, field: string, issues: Issue[]): string[] | null {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    issues.push({ type: 'list_type', loc: ['body', field], msg: 'Input should be a valid list', input: value })
    return null
  }
  const cleaned = (value as string[]).map((item) => item.trim())
  if (cleaned.some((item) => item === '')) {
    issues.push({ type: 'value_error', loc: ['body', field], msg: `Value error, ${field} cannot contain blank items`, input: value })
    return null
  }
  return cleaned
}

function readText(data: Record<string, unknown>, field: string, issues: Issue[], maxLength?: number): string | null {
  const value = data[field]
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') {
    issues.push({ type: 'string_type', loc: ['body', field], msg: 'Input should be a valid string', input: value })
    return null
  }
  const trimmed = value.trim()
  if (maxLength !== undefined && trimmed.length > maxLength) {
    issues.push({ type: 'string_too_long', loc: ['body', field], msg: `String should have at most ${maxLength} characters`, input: value })
    return null
  }
  return trimmed || null
}

function fail(status: number, code: string): Reply {
  return { status, body: { detail: code } }
}

function invalid(issues: Issue[]): Reply {
  return { status: 422, body: { detail: issues } }
}

function respond(reply: Reply): Response {
  if (reply.body === undefined || reply.status === 204) return new Response(null, { status: reply.status })
  return new Response(JSON.stringify(reply.body), { status: reply.status, headers: { 'Content-Type': 'application/json' } })
}

function wait(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    const aborted = () => new DOMException('The operation was aborted.', 'AbortError')
    if (signal?.aborted) {
      reject(aborted())
      return
    }
    let timer: ReturnType<typeof setTimeout> | undefined
    const onAbort = () => {
      clearTimeout(timer)
      reject(aborted())
    }
    timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function keywords(text: string | null): string[] {
  return (text ?? '')
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word))
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('')
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

function quoted(values: readonly string[]): string {
  return values.map((value) => `'${value}'`).join(', ')
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function toInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function newId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()
  const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}
