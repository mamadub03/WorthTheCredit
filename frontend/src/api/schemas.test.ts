import { describe, expect, it } from 'vitest'
import { courseSchema } from './courses.ts'
import { profileSchema } from './profile.ts'
import { recommendationsSchema } from './recommendations.ts'
import { myReviewSchema, reviewSchema } from './reviews.ts'

// The review example from BE2's worththecredit-api/docs/api-contract.md.
const be2Review = {
  id: '2d64a531-fa81-4674-9c36-424f3adb8439',
  course_code: 'SWEN-261',
  goals: ['career_preparation', 'skill_development'],
  worth_score: 4,
  skills: ['Agile', 'Unit testing'],
  difficulty: 3,
  weekly_hours: '7-9',
  feedback: 'Start the team project early.',
  professor: 'Dr. Rivera',
  semester: 'Fall 2025',
  created_at: '2026-11-08T00:37:32.987642Z',
}

const be2Recommendation = {
  course_code: 'CSCI-420',
  title: 'Principles of Data Mining',
  match_level: 'Strong Match',
  why: 'Hands-on ML on real data, which fits your goal of becoming an ML engineer.',
  skills: ['Pandas', 'Clustering'],
  student_insights: ['Reviewers found the real, messy data sets practical.'],
  difficulty_avg: 3.5,
  workload_summary: 'Most students report 10-12 hrs/week',
  worth_score: 4.5,
  review_count: 2,
  limitations: ['Only 2 reviews so far', 'Prerequisites not verified'],
}

describe('reviewSchema', () => {
  it("parses BE2's review into the app's shape", () => {
    expect(reviewSchema.parse(be2Review)).toEqual({
      id: be2Review.id,
      courseCode: 'SWEN-261',
      goals: ['career_preparation', 'skill_development'],
      worthScore: 4,
      skills: ['Agile', 'Unit testing'],
      difficulty: 3,
      weeklyHours: '7-9',
      feedback: 'Start the team project early.',
      professor: 'Dr. Rivera',
      semester: 'Fall 2025',
      createdAt: be2Review.created_at,
    })
  })

  it('drops goal keys it does not know and fills missing optional fields with null', () => {
    const { feedback: _f, professor: _p, semester: _s, ...required } = be2Review
    const review = reviewSchema.parse({ ...required, goals: ['career_preparation', 'degree_requirements'] })
    expect(review.goals).toEqual(['career_preparation'])
    expect(review.feedback).toBeNull()
    expect(review.professor).toBeNull()
    expect(review.semester).toBeNull()
  })

  it('rejects scores outside 1 to 5', () => {
    expect(reviewSchema.safeParse({ ...be2Review, worth_score: 6 }).success).toBe(false)
  })
})

describe('myReviewSchema', () => {
  it('handles both answers', () => {
    expect(myReviewSchema.parse({ course_code: 'SWEN-261', has_reviewed: false, review: null })).toEqual({
      courseCode: 'SWEN-261',
      hasReviewed: false,
      review: null,
    })
    expect(myReviewSchema.parse({ course_code: 'SWEN-261', has_reviewed: true, review: be2Review }).review?.id).toBe(be2Review.id)
  })
})

describe('courseSchema', () => {
  it("accepts BE2's and BE1's field names", () => {
    const be2 = courseSchema.parse({ course_code: 'GCIS-123', title: 'SD&PS I', department: 'GCIS', credit_hours: 4 })
    const be1 = courseSchema.parse({ id: 'uuid', code: 'GCIS-123', title: 'SD&PS I', department: 'GCIS', credits: 4 })
    expect(be2).toEqual(be1)
    expect(be2.code).toBe('GCIS-123')
    expect(be2.credits).toBe(4)
  })

  it('rejects a course with no code', () => {
    expect(courseSchema.safeParse({ title: 'Nameless' }).success).toBe(false)
  })
})

describe('profileSchema', () => {
  it('fills missing lists and text', () => {
    expect(profileSchema.parse({ major: 'Biology' })).toEqual({
      major: 'Biology',
      interests: [],
      skills: [],
      careerGoals: null,
      personalInterests: [],
      degreeRequirements: null,
      updatedAt: null,
    })
  })
})

describe('recommendationsSchema', () => {
  it("parses BE2's recommendation", () => {
    const result = recommendationsSchema.parse({ recommendations: [be2Recommendation] })
    expect(result.droppedCount).toBe(0)
    expect(result.items[0]).toMatchObject({
      courseCode: 'CSCI-420',
      matchLevel: 'strong',
      worthScore: 4.5,
      reviewCount: 2,
      studentInsights: ['Reviewers found the real, messy data sets practical.'],
    })
  })

  it('drops malformed and repeated items instead of failing the page', () => {
    const result = recommendationsSchema.parse({
      recommendations: [
        be2Recommendation,
        { ...be2Recommendation, course_code: 'CSCI-331', match_level: '87%' },
        { ...be2Recommendation, course_code: 'CSCI-332', why: '  ' },
        { ...be2Recommendation },
        'nonsense',
        { ...be2Recommendation, course_code: 'ISTE-340', match_level: 'moderate match', worth_score: null, student_insights: null },
      ],
    })
    expect(result.items.map((item) => item.courseCode)).toEqual(['CSCI-420', 'ISTE-340'])
    expect(result.items[1]).toMatchObject({ matchLevel: 'moderate', worthScore: null, studentInsights: [] })
    expect(result.droppedCount).toBe(4)
  })

  it('rejects a response without a recommendations list', () => {
    expect(recommendationsSchema.safeParse({ results: [] }).success).toBe(false)
  })
})
