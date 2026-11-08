import type { Page, Route } from '@playwright/test'
import { createMockApi } from '../src/api/mock/mockApi.ts'

/**
 * Where the app under test sends its API calls (VITE_API_BASE_URL in
 * playwright.config.ts). It's on the app's own origin, so there's no CORS.
 */
export const FAKE_API_PATH = '/api-fake'

export interface ApiCall {
  method: string
  /** The path under the API base, like "/courses/<id>/reviews". */
  path: string
  query: URLSearchParams
  /** The parsed JSON body, if any. */
  body: unknown
  authorization: string | null
}

export interface FakeBackend {
  /** Every API call the page made, in order. */
  readonly calls: readonly ApiCall[]
  callsTo(method: string, path: RegExp): ApiCall[]
  /** Answer the next matching call with this instead, like a 502 from Gemini or the backend's own 409 sentence. */
  respondOnce(method: string, path: RegExp, status: number, body: unknown): void
}

interface Override {
  method: string
  path: RegExp
  status: number
  body: unknown
}

/**
 * A stand-in backend at the network boundary. The app runs as it would
 * against the real API, making HTTP calls through its own client with the dev
 * sign-in token, and Playwright answers them with FE2's mock API, which
 * follows the contracts on main. Tests can then read request bodies and
 * inject errors. Owner: FE2 (#32).
 */
export async function installFakeBackend(page: Page, appOrigin: string): Promise<FakeBackend> {
  const baseUrl = `${appOrigin}${FAKE_API_PATH}`
  const api = createMockApi({
    baseUrl,
    latencyMs: 0,
    // Long enough to see the advisor's typing state, short enough to keep runs quick.
    recommendationLatencyMs: 300,
    storage: null,
    passthrough: async () => json(404, { detail: 'Not Found' }),
  })
  const calls: ApiCall[] = []
  const overrides: Override[] = []

  await page.route(`${baseUrl}/**`, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.slice(FAKE_API_PATH.length)
    const call: ApiCall = {
      method: request.method(),
      path,
      query: url.searchParams,
      body: parseBody(request.postData()),
      authorization: request.headers()['authorization'] ?? null,
    }
    calls.push(call)

    const index = overrides.findIndex((override) => override.method === call.method && override.path.test(path))
    const [override] = index >= 0 ? overrides.splice(index, 1) : []
    const response = override
      ? json(override.status, override.body)
      : await api.fetch(request.url(), { method: request.method(), headers: request.headers(), body: request.postData() ?? undefined })

    try {
      await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: await response.text() })
    } catch {
      // The page cancelled the request (Stop, or navigating away) before the answer came.
    }
  })

  return {
    calls,
    callsTo: (method, path) => calls.filter((call) => call.method === method && path.test(call.path)),
    respondOnce: (method, path, status, body) => {
      overrides.push({ method, path, status, body })
    },
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function parseBody(text: string | null): unknown {
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}
