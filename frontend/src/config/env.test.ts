import { describe, expect, it, vi } from 'vitest'
import { MOCK_DOMAINS, parseMockDomains, readEnv } from './env.ts'

const devServer = { DEV: true, MODE: 'development' }

describe('parseMockDomains', () => {
  it('treats empty and "none" as no mocks', () => {
    expect(parseMockDomains(undefined).size).toBe(0)
    expect(parseMockDomains(' none ').size).toBe(0)
  })

  it('treats "all" as every area', () => {
    expect([...parseMockDomains('ALL')]).toEqual([...MOCK_DOMAINS])
  })

  it('takes a list and ignores unknown names', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect([...parseMockDomains('reviews, recommendations, nope')]).toEqual(['reviews', 'recommendations'])
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })
})

describe('readEnv', () => {
  it('defaults the API base URL and trims a trailing slash', () => {
    expect(readEnv({}).apiBaseUrl).toBe('http://localhost:8000')
    expect(readEnv({ VITE_API_BASE_URL: 'https://api.example.test/v1/' }).apiBaseUrl).toBe('https://api.example.test/v1')
  })

  it('needs all three Auth0 values, and strips the scheme from the domain', () => {
    expect(readEnv({ VITE_AUTH0_DOMAIN: 'x.us.auth0.com', VITE_AUTH0_CLIENT_ID: 'id' }).auth0).toBeNull()
    expect(
      readEnv({ VITE_AUTH0_DOMAIN: 'https://x.us.auth0.com/', VITE_AUTH0_CLIENT_ID: 'id', VITE_AUTH0_AUDIENCE: 'aud' }).auth0,
    ).toEqual({ domain: 'x.us.auth0.com', clientId: 'id', audience: 'aud' })
  })

  it('allows dev sign-in only on the dev server, only while Auth0 is unset', () => {
    expect(readEnv({ ...devServer, VITE_DEV_AUTH: 'true' }).devAuth).toBe(true)
    expect(readEnv({ DEV: false, MODE: 'production', VITE_DEV_AUTH: 'true' }).devAuth).toBe(false)
    expect(readEnv({ DEV: true, MODE: 'test', VITE_DEV_AUTH: 'true' }).devAuth).toBe(false)
    expect(
      readEnv({
        ...devServer,
        VITE_DEV_AUTH: 'true',
        VITE_AUTH0_DOMAIN: 'x.us.auth0.com',
        VITE_AUTH0_CLIENT_ID: 'id',
        VITE_AUTH0_AUDIENCE: 'aud',
      }).devAuth,
    ).toBe(false)
  })
})
