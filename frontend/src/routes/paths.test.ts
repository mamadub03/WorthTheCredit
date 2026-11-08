import { describe, expect, it } from 'vitest'
import { normalizeCourseCode, paths, signInReturnPath } from './paths.ts'

const id = 'c0a5e000-0000-4000-8000-000000000003'

describe('paths', () => {
  it('builds course URLs from the course id', () => {
    expect(paths.course(id)).toBe(`/courses/${id}`)
  })

  it('builds the review form URL, with the course preselected when given', () => {
    expect(paths.writeReview()).toBe('/review')
    expect(paths.writeReview(id)).toBe(`/review?course=${id}`)
  })

  it('builds the sign-in URL with the page to come back to', () => {
    expect(paths.signIn()).toBe('/signin')
    expect(paths.signIn(`/review?course=${id}`)).toBe(`/signin?next=%2Freview%3Fcourse%3D${id}`)
  })
})

describe('signInReturnPath', () => {
  it('returns to pages on this site', () => {
    expect(signInReturnPath(`/review?course=${id}`)).toBe(`/review?course=${id}`)
    expect(signInReturnPath('/recommendations')).toBe('/recommendations')
  })

  it('sends anything else home', () => {
    for (const next of [null, undefined, '', 'https://evil.example', '//evil.example', '/\\evil.example', 'review', '/signin', '/signin?next=%2F', '/callback?code=1']) {
      expect(signInReturnPath(next)).toBe('/')
    }
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
