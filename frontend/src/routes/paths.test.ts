import { describe, expect, it } from 'vitest'
import { normalizeCourseCode, paths } from './paths.ts'

const id = 'c0a5e000-0000-4000-8000-000000000003'

describe('paths', () => {
  it('builds course URLs from the course id', () => {
    expect(paths.course(id)).toBe(`/courses/${id}`)
  })

  it('builds the review form URL, with the course preselected when given', () => {
    expect(paths.writeReview()).toBe('/review')
    expect(paths.writeReview(id)).toBe(`/review?course=${id}`)
  })
})

describe('normalizeCourseCode', () => {
  it('turns what students type into the canonical code', () => {
    expect(normalizeCourseCode('swen261')).toBe('SWEN-261')
    expect(normalizeCourseCode('SWEN 261')).toBe('SWEN-261')
    expect(normalizeCourseCode(' gcis-123 ')).toBe('GCIS-123')
  })

  it('leaves anything else trimmed', () => {
    expect(normalizeCourseCode(' machine learning ')).toBe('machine learning')
  })
})
