import { describe, expect, it } from 'vitest'
import { ApiError, errorFromResponse, fieldErrorsFrom422, messageForCode } from './errors.ts'

describe('errorFromResponse', () => {
  it("uses BE2's detail string as the code", () => {
    const error = errorFromResponse(409, { detail: 'already_reviewed' })
    expect(error).toBeInstanceOf(ApiError)
    expect(error.code).toBe('already_reviewed')
    expect(error.status).toBe(409)
    expect(error.message).toBe(messageForCode('already_reviewed'))
  })

  it('turns a FastAPI 422 list into field errors', () => {
    const error = errorFromResponse(422, {
      detail: [
        { type: 'less_than_equal', loc: ['body', 'worth_score'], msg: 'Input should be less than or equal to 5', input: 9 },
        { type: 'value_error', loc: ['body', 'skills', 2], msg: 'Value error, each tag must be at most 40 characters' },
        { type: 'value_error', loc: ['body'], msg: 'Value error, something about the whole body' },
      ],
    })
    expect(error.code).toBe('validation_error')
    expect(error.fieldErrors).toEqual({
      worth_score: 'Input should be less than or equal to 5',
      skills: 'each tag must be at most 40 characters',
      _form: 'something about the whole body',
    })
  })

  it('accepts a {code, message} detail object', () => {
    const error = errorFromResponse(409, { detail: { code: 'duplicate_review', message: 'Already reviewed.' } })
    expect(error.code).toBe('duplicate_review')
    expect(error.message).toBe('Already reviewed.')
  })

  it('falls back on the status code when the body has no detail', () => {
    expect(errorFromResponse(401, null).code).toBe('not_authenticated')
    expect(errorFromResponse(502, '<html>Bad gateway</html>').code).toBe('server_error')
    expect(errorFromResponse(418, {}).code).toBe('http_error')
  })
})

describe('fieldErrorsFrom422', () => {
  it('keeps the first message per field', () => {
    expect(
      fieldErrorsFrom422([
        { loc: ['body', 'goals'], msg: 'first' },
        { loc: ['body', 'goals', 0], msg: 'second' },
        'not an object',
      ]),
    ).toEqual({ goals: 'first' })
  })
})

describe('messageForCode', () => {
  it('has a safe fallback for unknown codes', () => {
    expect(messageForCode('something_new')).toBe(messageForCode('server_error'))
  })
})
