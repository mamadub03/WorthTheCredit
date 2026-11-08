/**
 * In-browser stand-in for the API, shaped like BE2's contract
 * (worththecredit-api/docs/api-contract.md on BackPart2): the same paths, JSON,
 * error detail strings, normalization, and dev-token rules. Owner: FE2 (#25).
 *
 * VITE_API_MOCKS picks which areas it answers; every other request goes to the
 * real server. Everything it returns is sample data, and DemoDataBanner says so.
 */
import type { AppEnv, MockDomain } from '../../config/env.ts'
import { GOALS, WEEKLY_HOURS, type GoalKey, type WeeklyHoursKey } from '../../domain/reviewVocabulary.ts'
import { normalizeCourseCode } from '../../routes/paths.ts'
import type { FetchLike } from '../client.ts'
import { MOCK_COURSES, MOCK_REVIEWS, type MockCourse, type MockReview } from './fixtures.ts'

interface MockUser {
  sub: string
  verified: boolean
}

interface ProfileFields {
  major: string
  interests: string[]
  skills: string[]
  /** Like the real API, omitted text comes back as "" rather than null. */
  career_goals: string
  personal_interests: string[]
  degree_requirements: string
}

interface ProfileRecord extends ProfileFields {
  updated_at: string
}

interface MockState {
  /** Reviews created since the page loaded (the seed reviews come from fixtures). */
  reviews: MockReview[]
  reports: { review_id: string; sub: string }[]
  profiles: Record<string, ProfileRecord>
  resentAt: Record<string, number>
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
  method: 'GET' | 'POST' | 'PUT'
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
  /** Keeps created reviews and profiles across reloads. Null keeps them in memory only. */
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null
  now?: () => Date
}

export interface MockApi {
  fetch: FetchLike
  /** Forgets everything created since the page loaded. */
  reset(): void
}

const STORAGE_KEY = 'wtc:mock-api:v1'
const ALL_DOMAINS: MockDomain[] = ['courses', 'reviews', 'profile', 'recommendations', 'auth']
const HOURS: WeeklyHoursKey[] = WEEKLY_HOURS.map((hours) => hours.key)
const GOAL_KEYS: GoalKey[] = GOALS.map((goal) => goal.key)
const REPORT_REASONS = ['spam', 'fake', 'inappropriate', 'off_topic', 'other']
const REPORT_ALIASES: Record<string, string> = {
  offensive: 'inappropriate',
  personal_info: 'inappropriate',
  not_about_course: 'off_topic',
}
const PREREQUISITES_NOTE = 'Prerequisites not verified; check the RIT catalog and your advisor'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const STOP_WORDS = new Set(['with', 'that', 'want', 'something', 'without', 'into', 'about', 'more', 'some', 'like', 'work', 'isn', 'too', 'heavy', 'and', 'the', 'for'])

/** BE2's dev-token rules (DEV_AUTH_BYPASS): "dev-unverified" is unverified, "dev:<name>" picks the user, anything else is "local-user". */
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

  function emptyState(): MockState {
    return { reviews: [], reports: [], profiles: {}, resentAt: {} }
  }

  function load(): MockState {
    try {
      const saved = storage?.getItem(STORAGE_KEY)
      return saved ? { ...emptyState(), ...(JSON.parse(saved) as Partial<MockState>) } : emptyState()
    } catch {
      return emptyState()
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
  const reviewsFor = (code: string): MockReview[] => allReviews().filter((review) => review.course_code === code)
  const findCourse = (code: string): MockCourse | undefined =>
    MOCK_COURSES.find((course) => course.course_code === normalizeCourseCode(code))

  function statsFor(code: string) {
    const reviews = reviewsFor(code)
    const count = reviews.length
    const distribution = Object.fromEntries(HOURS.map((hours) => [hours, 0])) as Record<WeeklyHoursKey, number>
    for (const review of reviews) distribution[review.weekly_hours] += 1
    let mostCommon: WeeklyHoursKey | null = null
    for (const hours of HOURS) {
      if (distribution[hours] > 0 && (mostCommon === null || distribution[hours] > distribution[mostCommon])) mostCommon = hours
    }
    // Like the real API: no summary (null) until someone reports their hours.
    let summary: string | null = null
    if (mostCommon) {
      const picked = distribution[mostCommon]
      summary =
        picked / count >= 0.5
          ? `Most students report ${mostCommon} hrs/week`
          : `Most common: ${mostCommon} hrs/week (${picked} of ${count} reviews)`
    }

    const skillCounts = new Map<string, { skill: string; count: number }>()
    for (const review of reviews) {
      for (const skill of review.skills) {
        const entry = skillCounts.get(skill.toLowerCase())
        if (entry) entry.count += 1
        else skillCounts.set(skill.toLowerCase(), { skill, count: 1 })
      }
    }

    const professors = new Map<string, MockReview[]>()
    for (const review of reviews) {
      if (!review.professor) continue
      const key = normalizeName(review.professor)
      professors.set(key, [...(professors.get(key) ?? []), review])
    }

    return {
      course_code: code,
      review_count: count,
      worth_score: count ? round1(average(reviews.map((review) => review.worth_score))) : null,
      difficulty_avg: count ? round1(average(reviews.map((review) => review.difficulty))) : null,
      workload_distribution: distribution,
      workload_most_common: mostCommon,
      workload_summary: summary,
      top_skills: [...skillCounts.values()]
        .sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill))
        .slice(0, 5),
      goals: GOAL_KEYS.flatMap((goal) => {
        const matching = reviews.filter((review) => review.goals.includes(goal))
        return matching.length
          ? [{ goal, count: matching.length, worth_score: round1(average(matching.map((review) => review.worth_score))) }]
          : []
      }),
      professors: [...professors.values()].map((group) => ({
        professor: group[0].professor,
        review_count: group.length,
        worth_score: round1(average(group.map((review) => review.worth_score))),
        difficulty_avg: round1(average(group.map((review) => review.difficulty))),
      })),
      low_data: count < 3,
    }
  }

  function courseSummary(course: MockCourse) {
    const stats = statsFor(course.course_code)
    return {
      course_code: course.course_code,
      title: course.title,
      department: course.department,
      credit_hours: course.credit_hours,
      worth_score: stats.worth_score,
      review_count: stats.review_count,
    }
  }

  function searchCourses({ query }: Context): Reply {
    const text = (query.get('q') ?? '').trim().toLowerCase()
    const department = (query.get('department') ?? '').trim().toUpperCase()
    const limit = clamp(toInt(query.get('limit'), 20), 1, 100)
    const offset = Math.max(0, toInt(query.get('offset'), 0))
    const matches = MOCK_COURSES.filter(
      (course) => (!department || course.department === department) && (!text || haystack(course).includes(text)),
    )
    return { status: 200, body: matches.slice(offset, offset + limit).map(courseSummary) }
  }

  function courseDetail({ params }: Context): Reply {
    const course = findCourse(params[0])
    if (!course) return fail(404, 'course_not_found')
    return {
      status: 200,
      body: {
        ...courseSummary(course),
        description: course.description,
        college: course.college,
        prerequisites: course.prerequisites,
        stats: statsFor(course.course_code),
      },
    }
  }

  function courseStats({ params }: Context): Reply {
    const course = findCourse(params[0])
    return course ? { status: 200, body: statsFor(course.course_code) } : fail(404, 'course_not_found')
  }

  function listReviews({ params, query }: Context): Reply {
    const course = findCourse(params[0])
    if (!course) return fail(404, 'course_not_found')
    const professor = normalizeName(query.get('professor') ?? '')
    const limit = clamp(toInt(query.get('limit'), 20), 1, 100)
    const offset = Math.max(0, toInt(query.get('offset'), 0))
    const matching = reviewsFor(course.course_code)
      .filter((review) => !professor || normalizeName(review.professor ?? '') === professor)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
    return {
      status: 200,
      body: { items: matching.slice(offset, offset + limit).map(publicReview), total: matching.length, limit, offset },
    }
  }

  function createReview({ body, user }: Context): Reply {
    if (!user) return fail(401, 'not_authenticated')
    if (!user.verified) return fail(403, 'email_not_verified')
    const data = asRecord(body)
    const issues: Issue[] = []
    const rawCode = data.course_code
    if (typeof rawCode !== 'string' || rawCode.trim() === '') issues.push(issueAt(['body'], 'course_code', 'Field required', rawCode, 'missing'))
    const goals = readGoals(data, issues)
    const worthScore = readScore(data, 'worth_score', issues)
    const skills = readTags(data, 'skills', 1, 10, issues)
    const difficulty = readScore(data, 'difficulty', issues)
    const weeklyHours = readHours(data, issues)
    const feedback = readText(data, 'feedback', 1000, issues)
    const professor = readText(data, 'professor', 100, issues)
    const semester = readSemester(data, issues)
    if (issues.length > 0 || goals === null || worthScore === null || skills === null || difficulty === null || weeklyHours === null) {
      return invalid(issues)
    }
    const course = findCourse(rawCode as string)
    if (!course) return fail(404, 'course_not_found')
    if (allReviews().some((review) => review.sub === user.sub && review.course_code === course.course_code)) {
      return fail(409, 'already_reviewed')
    }
    const review: MockReview = {
      id: newId(),
      sub: user.sub,
      course_code: course.course_code,
      goals,
      worth_score: worthScore,
      skills,
      difficulty,
      weekly_hours: weeklyHours,
      feedback,
      professor,
      semester,
      created_at: now().toISOString(),
    }
    state.reviews.push(review)
    save()
    return { status: 201, body: publicReview(review) }
  }

  function myReview({ query, user }: Context): Reply {
    if (!user) return fail(401, 'not_authenticated')
    const code = query.get('course_code')
    if (!code) return invalid([{ type: 'missing', loc: ['query', 'course_code'], msg: 'Field required', input: null }])
    const course = findCourse(code)
    if (!course) return fail(404, 'course_not_found')
    const review = allReviews().find((item) => item.sub === user.sub && item.course_code === course.course_code)
    return {
      status: 200,
      body: { course_code: course.course_code, has_reviewed: Boolean(review), review: review ? publicReview(review) : null },
    }
  }

  function reportReview({ params, body, user }: Context): Reply {
    if (!user) return fail(401, 'not_authenticated')
    const data = asRecord(body)
    const issues: Issue[] = []
    const given = typeof data.reason === 'string' ? data.reason.trim().toLowerCase() : ''
    const reason = REPORT_ALIASES[given] ?? given
    if (!REPORT_REASONS.includes(reason)) {
      issues.push({ type: 'literal_error', loc: ['body', 'reason'], msg: `Input should be ${quoted(REPORT_REASONS)}`, input: data.reason })
    }
    readText(data, 'note', 500, issues)
    const reviewId = params[0]
    if (!UUID.test(reviewId)) issues.push({ type: 'uuid_parsing', loc: ['path', 'review_id'], msg: 'Input should be a valid UUID', input: reviewId })
    if (issues.length > 0) return invalid(issues)
    if (!allReviews().some((review) => review.id === reviewId)) return fail(404, 'review_not_found')
    if (state.reports.some((report) => report.review_id === reviewId && report.sub === user.sub)) return fail(409, 'already_reported')
    state.reports.push({ review_id: reviewId, sub: user.sub })
    save()
    return { status: 201, body: { status: 'received' } }
  }

  function getProfile({ user }: Context): Reply {
    if (!user) return fail(401, 'not_authenticated')
    const profile = state.profiles[user.sub]
    return profile ? { status: 200, body: profileResponse(profile) } : fail(404, 'profile_not_found')
  }

  function putProfile({ body, user }: Context): Reply {
    if (!user) return fail(401, 'not_authenticated')
    const issues: Issue[] = []
    const fields = readProfile(asRecord(body), ['body'], issues)
    if (!fields) return invalid(issues)
    const record: ProfileRecord = { ...fields, updated_at: now().toISOString() }
    state.profiles[user.sub] = record
    save()
    return { status: 200, body: profileResponse(record) }
  }

  function recommend({ body, user }: Context): Reply {
    if (!user) return fail(401, 'not_authenticated')
    const data = asRecord(body)
    const issues: Issue[] = []
    const query = readText(data, 'query', 500, issues)
    let profile: ProfileFields | null = null
    if (data.profile !== undefined && data.profile !== null) {
      profile = readProfile(asRecord(data.profile), ['body', 'profile'], issues)
    }
    if (issues.length > 0) return invalid(issues)
    profile ??= state.profiles[user.sub] ?? null
    if (!profile) return fail(400, 'profile_required')
    return { status: 200, body: { recommendations: rank(profile, query) } }
  }

  function rank(profile: ProfileFields, query: string | null) {
    const wanted = [
      ...profile.interests.map((phrase) => ({ phrase, weight: 2 })),
      ...profile.personal_interests.map((phrase) => ({ phrase, weight: 1.5 })),
      ...profile.skills.map((phrase) => ({ phrase, weight: 1 })),
      ...keywords(profile.career_goals).map((phrase) => ({ phrase, weight: 1 })),
      ...keywords(query).map((phrase) => ({ phrase, weight: 1 })),
      ...keywords(profile.major).map((phrase) => ({ phrase, weight: 0.5 })),
    ]
    const scored = MOCK_COURSES.map((course) => {
      const text = haystack(course)
      const matched: string[] = []
      let score = 0
      for (const { phrase, weight } of wanted) {
        const needle = phrase.toLowerCase()
        if (needle.length < 3 || !text.includes(needle)) continue
        score += weight
        if (!matched.some((item) => item.toLowerCase() === needle)) matched.push(phrase)
      }
      return { course, score, matched, stats: statsFor(course.course_code) }
    })
    const byWorth = (a: (typeof scored)[number], b: (typeof scored)[number]) => (b.stats.worth_score ?? 0) - (a.stats.worth_score ?? 0)
    const ranked = scored.filter((item) => item.score > 0).sort((a, b) => b.score - a.score || byWorth(a, b))
    const picks = ranked.length > 0 ? ranked.slice(0, 6) : [...scored].sort(byWorth).slice(0, 3)

    return picks.map(({ course, score, matched, stats }) => {
      const count = stats.review_count
      return {
        course_code: course.course_code,
        title: course.title,
        match_level: score >= 4 ? 'Strong Match' : score >= 2 ? 'Moderate Match' : 'Limited Match',
        why: matched.length
          ? `Matches your interest in ${joinList(matched.slice(0, 3).map((item) => item.toLowerCase()))}.`
          : `A well-reviewed ${course.department} course that could round out your schedule.`,
        skills: course.tags.slice(0, 3),
        student_insights: reviewsFor(course.course_code)
          .flatMap((review) => (review.feedback ? [review.feedback] : []))
          .slice(0, 2),
        difficulty_avg: stats.difficulty_avg,
        workload_summary: stats.workload_summary ?? 'No workload reports yet',
        worth_score: stats.worth_score,
        review_count: count,
        limitations: [
          ...(count === 0 ? ['No student reviews yet'] : count < 3 ? [`Only ${count} review${count === 1 ? '' : 's'} so far`] : []),
          PREREQUISITES_NOTE,
        ],
      }
    })
  }

  function resendVerification({ user }: Context): Reply {
    if (!user) return fail(401, 'not_authenticated')
    const time = now().getTime()
    if (time - (state.resentAt[user.sub] ?? 0) < 60_000) return fail(429, 'rate_limited')
    state.resentAt[user.sub] = time
    save()
    return { status: 204 }
  }

  const routes: Route[] = [
    { domain: 'courses', method: 'GET', pattern: /^\/courses$/, handle: searchCourses },
    { domain: 'courses', method: 'GET', pattern: /^\/courses\/([^/]+)$/, handle: courseDetail },
    { domain: 'reviews', method: 'GET', pattern: /^\/courses\/([^/]+)\/stats$/, handle: courseStats },
    { domain: 'reviews', method: 'GET', pattern: /^\/courses\/([^/]+)\/reviews$/, handle: listReviews },
    { domain: 'reviews', method: 'POST', pattern: /^\/reviews$/, handle: createReview },
    { domain: 'reviews', method: 'GET', pattern: /^\/reviews\/me$/, handle: myReview },
    { domain: 'reviews', method: 'POST', pattern: /^\/reviews\/([^/]+)\/report$/, handle: reportReview },
    { domain: 'profile', method: 'GET', pattern: /^\/profile$/, handle: getProfile },
    { domain: 'profile', method: 'PUT', pattern: /^\/profile$/, handle: putProfile },
    { domain: 'recommendations', method: 'POST', pattern: /^\/recommendations$/, handle: recommend },
    { domain: 'auth', method: 'POST', pattern: /^\/auth\/resend-verification$/, handle: resendVerification },
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
      state = emptyState()
      save()
    },
  }
}

let shared: MockApi | null = null

/** One mock per page load, so every hook sees the same reviews and profiles. */
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

function publicReview(review: MockReview) {
  const { sub: _sub, ...rest } = review
  return rest
}

function profileResponse(profile: ProfileRecord) {
  return { ...profile, academic_interests: profile.interests, existing_skills: profile.skills }
}

function readProfile(data: Record<string, unknown>, loc: string[], issues: Issue[]): ProfileFields | null {
  const before = issues.length
  const major = readText(data, 'major', 100, issues, loc)
  if (major === null && issues.length === before) issues.push(issueAt(loc, 'major', 'Field required', data.major, 'missing'))
  const interests = readTags({ ...data, interests: data.interests ?? data.academic_interests }, 'interests', 0, 10, issues, loc)
  const skills = readTags({ ...data, skills: data.skills ?? data.existing_skills }, 'skills', 0, 10, issues, loc)
  const careerGoals = readText(data, 'career_goals', 1000, issues, loc)
  const personalInterests = readTags(data, 'personal_interests', 0, 10, issues, loc)
  const degreeRequirements = readText(data, 'degree_requirements', 500, issues, loc)
  if (issues.length > before || major === null || interests === null || skills === null || personalInterests === null) return null
  return {
    major,
    interests,
    skills,
    career_goals: careerGoals ?? '',
    personal_interests: personalInterests,
    degree_requirements: degreeRequirements ?? '',
  }
}

function readGoals(data: Record<string, unknown>, issues: Issue[]): GoalKey[] | null {
  const value = data.goals
  if (!Array.isArray(value)) {
    issues.push(issueAt(['body'], 'goals', 'Field required', value, 'missing'))
    return null
  }
  const unknownIndex = value.findIndex((goal) => typeof goal !== 'string' || !GOAL_KEYS.includes(goal as GoalKey))
  if (unknownIndex >= 0) {
    issues.push({ type: 'literal_error', loc: ['body', 'goals', unknownIndex], msg: `Input should be ${quoted(GOAL_KEYS)}`, input: value[unknownIndex] })
    return null
  }
  const unique = [...new Set(value as GoalKey[])]
  if (unique.length < 1 || unique.length > 5) {
    issues.push(issueAt(['body'], 'goals', `List should have between 1 and 5 items after validation`, value, unique.length < 1 ? 'too_short' : 'too_long'))
    return null
  }
  return unique
}

function readScore(data: Record<string, unknown>, field: string, issues: Issue[]): number | null {
  const value = data[field]
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    issues.push(issueAt(['body'], field, 'Input should be a valid integer', value, 'int_type'))
    return null
  }
  if (value < 1 || value > 5) {
    const tooLow = value < 1
    issues.push(
      issueAt(['body'], field, `Input should be ${tooLow ? 'greater than or equal to 1' : 'less than or equal to 5'}`, value, tooLow ? 'greater_than_equal' : 'less_than_equal'),
    )
    return null
  }
  return value
}

function readHours(data: Record<string, unknown>, issues: Issue[]): WeeklyHoursKey | null {
  const value = data.weekly_hours
  if (typeof value === 'string' && HOURS.includes(value as WeeklyHoursKey)) return value as WeeklyHoursKey
  issues.push({ type: 'literal_error', loc: ['body', 'weekly_hours'], msg: `Input should be ${quoted(HOURS)}`, input: value })
  return null
}

function readTags(
  data: Record<string, unknown>,
  field: string,
  min: number,
  max: number,
  issues: Issue[],
  loc: string[] = ['body'],
): string[] | null {
  const value = data[field]
  if (value === undefined || value === null) {
    if (min === 0) return []
    issues.push(issueAt(loc, field, 'Field required', value, 'missing'))
    return null
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    issues.push(issueAt(loc, field, 'Input should be a valid list of strings', value, 'list_type'))
    return null
  }
  const cleaned = dedupe((value as string[]).map((item) => item.trim().replace(/\s+/g, ' ')).filter(Boolean))
  if (cleaned.length < min || cleaned.length > max) {
    issues.push(issueAt(loc, field, `List should have between ${min} and ${max} items after validation`, value, cleaned.length < min ? 'too_short' : 'too_long'))
    return null
  }
  const tooLong = cleaned.find((item) => item.length > 40)
  if (tooLong) {
    issues.push(issueAt(loc, field, 'Value error, each tag must be at most 40 characters', tooLong))
    return null
  }
  return cleaned
}

function readText(data: Record<string, unknown>, field: string, maxLength: number, issues: Issue[], loc: string[] = ['body']): string | null {
  const value = data[field]
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') {
    issues.push(issueAt(loc, field, 'Input should be a valid string', value, 'string_type'))
    return null
  }
  const trimmed = value.trim()
  if (trimmed.length > maxLength) {
    issues.push(issueAt(loc, field, `String should have at most ${maxLength} characters`, value, 'string_too_long'))
    return null
  }
  return trimmed || null
}

function readSemester(data: Record<string, unknown>, issues: Issue[]): string | null {
  const value = data.semester
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) return null
  const match = typeof value === 'string' ? /^(fall|spring|summer)\s+(\d{4})$/i.exec(value.trim()) : null
  if (!match) {
    issues.push(issueAt(['body'], 'semester', "Value error, semester must look like 'Fall 2025'", value))
    return null
  }
  return `${match[1][0].toUpperCase()}${match[1].slice(1).toLowerCase()} ${match[2]}`
}

function issueAt(loc: string[], field: string, msg: string, input: unknown, type = 'value_error'): Issue {
  return { type, loc: [...loc, field], msg, input }
}

function fail(status: number, code: string): Reply {
  return { status, body: { detail: code } }
}

function invalid(issues: Issue[]): Reply {
  return { status: 422, body: { detail: issues } }
}

function respond(reply: Reply): Response {
  if (reply.body === undefined || reply.status === 204) return new Response(null, { status: reply.status })
  return new Response(JSON.stringify(reply.body), {
    status: reply.status,
    headers: { 'Content-Type': 'application/json' },
  })
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

function haystack(course: MockCourse): string {
  return [course.course_code, course.title, course.description.replace(/DEMO DATA\.?/g, ''), course.department, ...course.tags]
    .join(' ')
    .toLowerCase()
}

function keywords(text: string | null): string[] {
  return (text ?? '')
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word))
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = item.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
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

function round1(value: number): number {
  return Math.round(value * 10) / 10
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
