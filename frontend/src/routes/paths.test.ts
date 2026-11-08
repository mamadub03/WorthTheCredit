import { describe, expect, it } from 'vitest'
import { normalizeCourseCode, paths } from './paths.ts'

describe('paths', () => {
  it('builds course URLs from the course code', () => {
    expect(paths.course('GCIS-123')).toBe('/courses/GCIS-123')
    expect(paths.writeReview('GCIS-123')).toBe('/courses/GCIS-123/review')
    expect(paths.course('a/b')).toBe('/courses/a%2Fb')
  })
})

describe('normalizeCourseCode', () => {
  it('matches BE2 normalization', () => {
    expect(normalizeCourseCode('swen261')).toBe('SWEN-261')
    expect(normalizeCourseCode('SWEN 261')).toBe('SWEN-261')
    expect(normalizeCourseCode(' gcis-123 ')).toBe('GCIS-123')
  })

  it('leaves anything else trimmed and uppercased', () => {
    expect(normalizeCourseCode(' nope ')).toBe('NOPE')
  })
})
