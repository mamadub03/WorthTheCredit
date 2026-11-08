import { describe, expect, it } from 'vitest'
import { addSkill, emptyReview, semesterYears, toReviewRequest, validateReview, type ReviewFormValues } from './reviewFormModel.ts'

const filled: ReviewFormValues = {
  courseId: 'c0a5e000-0000-4000-8000-000000000003',
  goals: ['career_preparation', 'skill_development'],
  worthScore: 4,
  conceptDifficulty: 3,
  weeklyHoursRange: '6-10',
  skillsGained: ['Agile', 'Code review'],
  feedback: '  Start the team project early.  ',
  instructorName: ' ',
  semesterTerm: 'Fall',
  semesterYear: '2025',
}

describe('validateReview', () => {
  it('asks for every required answer on an empty form', () => {
    expect(Object.keys(validateReview(emptyReview())).sort()).toEqual(
      ['conceptDifficulty', 'courseId', 'goals', 'skillsGained', 'weeklyHoursRange', 'worthScore'].sort(),
    )
  })

  it('accepts a complete form', () => {
    expect(validateReview(filled)).toEqual({})
  })

  it('needs term and year together', () => {
    expect(validateReview({ ...filled, semesterYear: '' }).semesterTerm).toMatch(/both a term and a year/)
    expect(validateReview({ ...filled, semesterTerm: '', semesterYear: '' })).toEqual({})
  })

  it('caps feedback and professor length', () => {
    expect(validateReview({ ...filled, feedback: 'x'.repeat(1001) }).feedback).toMatch(/1,000/)
    expect(validateReview({ ...filled, instructorName: 'x'.repeat(101) }).instructorName).toMatch(/100/)
  })
})

describe('addSkill', () => {
  it('trims and collapses spaces', () => {
    expect(addSkill([], '  unit   testing ')).toEqual({ skills: ['unit testing'], error: null })
  })

  it('ignores empty text without an error', () => {
    expect(addSkill(['Agile'], '   ')).toEqual({ skills: ['Agile'], error: null })
  })

  it('refuses repeats, long skills, and an eleventh skill', () => {
    expect(addSkill(['Agile'], 'agile').error).toMatch(/already/)
    expect(addSkill([], 'x'.repeat(41)).error).toMatch(/40/)
    expect(addSkill(Array.from({ length: 10 }, (_, index) => `s${index}`), 'one more').error).toMatch(/up to 10/)
  })
})

describe('toReviewRequest', () => {
  it("builds exactly BE2's ReviewCreate keys", () => {
    const { courseId, body } = toReviewRequest(filled)
    expect(courseId).toBe(filled.courseId)
    expect(body).toEqual({
      goals: ['career_preparation', 'skill_development'],
      worth_score: 4,
      concept_difficulty: 3,
      weekly_hours_range: '6-10',
      skills_gained: ['Agile', 'Code review'],
      feedback: 'Start the team project early.',
      instructor_name: null,
      semester: 'Fall 2025',
    })
  })

  it('refuses an invalid form', () => {
    expect(() => toReviewRequest(emptyReview())).toThrow()
  })
})

describe('semesterYears', () => {
  it('lists this year and the five before it', () => {
    expect(semesterYears(new Date('2026-11-07T12:00:00'))).toEqual(['2026', '2025', '2024', '2023', '2022', '2021'])
  })
})
