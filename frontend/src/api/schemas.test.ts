import { describe, expect, it } from 'vitest'
import { courseDetailSchema, courseSearchSchema, courseSummarySchema } from './courses.ts'
import { recommendationsSchema } from './recommendations.ts'
import { reviewSchema, worthScoreSchema } from './reviews.ts'

// Shapes from the contracts on main (issue #25 comment, backend/app/schemas/*.py).
const course = {
  id: 'c0a5e000-0000-4000-8000-000000000006',
  code: 'ISTE-240',
  title: 'Web and Mobile II',
  description: 'Client-side web development.',
  department: 'ISTE',
  college: 'Golisano College of Computing and Information Sciences',
  campus: 'Henrietta',
  credits: 3,
  prerequisites: null,
}

const review = {
  id: '0e7d6a52-3c1b-4f8e-a9d2-6b4c1e8f7a35',
  course_id: course.id,
  goals: ['career_preparation', 'skill_development'],
  worth_score: 4,
  concept_difficulty: 3,
  weekly_hours_range: '6-10',
  skills_gained: ['JavaScript', 'Accessibility'],
  feedback: 'Start the projects early.',
  instructor_name: 'Prof. Example',
  semester: 'Fall 2025',
  created_at: '2026-11-07T23:10:00.123456-05:00',
}

const item = {
  course,
  match_level: 'strong_match',
  explanation: 'Builds the front-end skills your career goal needs.',
  community_worth_score: 4.25,
  review_count: 4,
}

describe('course schemas', () => {
  it('parse a search page', () => {
    const page = courseSearchSchema.parse({ results: [course], total: 50, limit: 20, offset: 0 })
    expect(page.total).toBe(50)
    expect(page.results[0]).toEqual({
      id: course.id,
      code: 'ISTE-240',
      title: 'Web and Mobile II',
      description: 'Client-side web development.',
      department: 'ISTE',
      college: course.college,
      campus: 'Henrietta',
      credits: 3,
      prerequisites: null,
    })
  })

  it('fill missing optional fields', () => {
    const minimal = courseSummarySchema.parse({ id: course.id, code: 'ISTE-240', title: 'Web and Mobile II', prerequisites: '' })
    expect(minimal).toMatchObject({ description: '', department: null, credits: null, prerequisites: null })
  })

  it('parse details with and without reviews', () => {
    expect(
      courseDetailSchema.parse({ ...course, community_worth_score: null, review_count: 0, average_concept_difficulty: null }),
    ).toMatchObject({ worthScore: null, reviewCount: 0, averageDifficulty: null })
    expect(
      courseDetailSchema.parse({ ...course, community_worth_score: 4.333333, review_count: 3, average_concept_difficulty: 2.5 }),
    ).toMatchObject({ worthScore: 4.333333, reviewCount: 3, averageDifficulty: 2.5 })
  })
})

describe('reviewSchema', () => {
  it('parses ReviewPublic into the app shape', () => {
    expect(reviewSchema.parse(review)).toEqual({
      id: review.id,
      courseId: course.id,
      goals: ['career_preparation', 'skill_development'],
      worthScore: 4,
      conceptDifficulty: 3,
      weeklyHoursRange: '6-10',
      skillsGained: ['JavaScript', 'Accessibility'],
      feedback: 'Start the projects early.',
      instructorName: 'Prof. Example',
      semester: 'Fall 2025',
      createdAt: review.created_at,
    })
  })

  it('drops unknown goals and fills missing optional fields', () => {
    const { feedback: _f, instructor_name: _i, semester: _s, skills_gained: _k, ...required } = review
    const parsed = reviewSchema.parse({ ...required, goals: ['career_preparation', 'degree_requirement'] })
    expect(parsed.goals).toEqual(['career_preparation'])
    expect(parsed).toMatchObject({ skillsGained: [], feedback: null, instructorName: null, semester: null })
  })

  it('rejects scores outside 1 to 5', () => {
    expect(reviewSchema.safeParse({ ...review, concept_difficulty: 6 }).success).toBe(false)
  })
})

describe('worthScoreSchema', () => {
  it('fills every workload range', () => {
    expect(
      worthScoreSchema.parse({ course_id: course.id, community_worth_score: null, review_count: 0, average_concept_difficulty: null }),
    ).toEqual({
      courseId: course.id,
      worthScore: null,
      reviewCount: 0,
      averageDifficulty: null,
      workload: { '0-3': 0, '3-6': 0, '6-10': 0, '10+': 0 },
    })
  })
})

describe('recommendationsSchema', () => {
  it('parses a recommendation', () => {
    const result = recommendationsSchema.parse({ recommendations: [item] })
    expect(result.droppedCount).toBe(0)
    expect(result.items[0]).toMatchObject({ matchLevel: 'strong_match', worthScore: 4.25, reviewCount: 4 })
    expect(result.items[0].course.code).toBe('ISTE-240')
  })

  it('drops malformed and repeated items instead of failing the page', () => {
    const other = { ...course, id: 'c0a5e000-0000-4000-8000-000000000007', code: 'IGME-220' }
    const result = recommendationsSchema.parse({
      recommendations: [
        item,
        { ...item, course: other, match_level: '87%' },
        { ...item, course: other, explanation: '  ' },
        { ...item, course: { code: 'NO-ID' } },
        item,
        { ...item, course: other, match_level: 'Good match', community_worth_score: null, review_count: null },
      ],
    })
    expect(result.items.map((recommendation) => recommendation.course.code)).toEqual(['ISTE-240', 'IGME-220'])
    expect(result.items[1]).toMatchObject({ matchLevel: 'good_match', worthScore: null, reviewCount: 0 })
    expect(result.droppedCount).toBe(4)
  })

  it('rejects a response without a recommendations list', () => {
    expect(recommendationsSchema.safeParse({ results: [] }).success).toBe(false)
  })
})
