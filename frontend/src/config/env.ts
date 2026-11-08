/**
 * Typed access to the frontend's build-time settings (the VITE_* variables in
 * frontend/.env.example). All of them are public, so nothing secret belongs here.
 * Owner: FE2 (#25).
 */

export const MOCK_DOMAINS = ['courses', 'reviews', 'recommendations'] as const
export type MockDomain = (typeof MOCK_DOMAINS)[number]

export interface Auth0Config {
  domain: string
  clientId: string
  audience: string
}

export interface AppEnv {
  /** FastAPI base URL without a trailing slash, for example http://localhost:8000. */
  apiBaseUrl: string
  /** API areas the in-browser mock serves instead of the network. */
  mockDomains: ReadonlySet<MockDomain>
  /** Auth0 settings, or null while any of the three values is missing. */
  auth0: Auth0Config | null
  /** Fake sign-in for local work. Only ever true under `vite dev`, and only while Auth0 isn't configured. */
  devAuth: boolean
  /** Whether the dev student starts with an unverified email, to try the verify-email screen. */
  devAuthStartsUnverified: boolean
}

type RawEnv = Record<string, string | boolean | undefined>

export function parseMockDomains(value: string | undefined): Set<MockDomain> {
  const text = (value ?? '').trim().toLowerCase()
  if (text === '' || text === 'none' || text === 'false') return new Set()
  if (text === 'all' || text === 'true') return new Set(MOCK_DOMAINS)
  const known = new Set<string>(MOCK_DOMAINS)
  const picked = new Set<MockDomain>()
  for (const part of text.split(',')) {
    const name = part.trim()
    if (known.has(name)) picked.add(name as MockDomain)
    else if (name) console.warn(`VITE_API_MOCKS: unknown area "${name}" ignored`)
  }
  return picked
}

export function readEnv(raw: RawEnv): AppEnv {
  const text = (key: string): string => {
    const value = raw[key]
    return typeof value === 'string' ? value.trim() : ''
  }
  const domain = text('VITE_AUTH0_DOMAIN').replace(/^https?:\/\//, '').replace(/\/+$/, '')
  const clientId = text('VITE_AUTH0_CLIENT_ID')
  const audience = text('VITE_AUTH0_AUDIENCE')
  const auth0 = domain && clientId && audience ? { domain, clientId, audience } : null
  // `vite build` sets DEV to false, so a production bundle can never turn dev sign-in on.
  const isDevServer = raw.DEV === true && raw.MODE !== 'test'

  return {
    apiBaseUrl: (text('VITE_API_BASE_URL') || 'http://localhost:8000').replace(/\/+$/, ''),
    mockDomains: parseMockDomains(text('VITE_API_MOCKS')),
    auth0,
    devAuth: isDevServer && auth0 === null && text('VITE_DEV_AUTH') === 'true',
    devAuthStartsUnverified: text('VITE_DEV_AUTH_UNVERIFIED') === 'true',
  }
}

export const env: AppEnv = readEnv(import.meta.env as RawEnv)
