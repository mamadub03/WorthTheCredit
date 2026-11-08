import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { buildUrl, createApiClient, type FetchLike } from './client.ts'
import type { ApiError } from './errors.ts'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function recordingFetch(reply: (input: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: { input: string; init: RequestInit }[] = []
  const fetch: FetchLike = async (input, init) => {
    calls.push({ input, init })
    return reply(input, init)
  }
  return { fetch, calls }
}

/** A fetch that only settles when its signal aborts, like a server that never answers. */
const hangingFetch: FetchLike = (_input, init) =>
  new Promise((_resolve, reject) => {
    init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
  })

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (error) {
    return error as ApiError
  }
  throw new Error('expected the request to fail')
}

describe('buildUrl', () => {
  it('keeps a path prefix on the base URL and skips empty query values', () => {
    expect(buildUrl('http://localhost:8000/api/', '/courses', { q: 'web dev', limit: 5, empty: '', none: null })).toBe(
      'http://localhost:8000/api/courses?q=web+dev&limit=5',
    )
  })
})

describe('createApiClient', () => {
  it('sends JSON and parses the reply through the schema', async () => {
    const { fetch, calls } = recordingFetch(() => json(201, { id: 7, name: 'ok' }))
    const client = createApiClient({ baseUrl: 'http://api.test', fetch })
    const schema = z.object({ id: z.number() }).transform((value) => ({ itemId: value.id }))

    const result = await client.request('/items', { method: 'POST', body: { a: 1 }, schema })

    expect(result).toEqual({ itemId: 7 })
    expect(calls[0].input).toBe('http://api.test/items')
    expect(calls[0].init.method).toBe('POST')
    expect(calls[0].init.body).toBe('{"a":1}')
    expect((calls[0].init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })

  it('sends no Content-Type on a GET', async () => {
    const { fetch, calls } = recordingFetch(() => json(200, {}))
    await createApiClient({ baseUrl: 'http://api.test', fetch }).request('/health')
    expect((calls[0].init.headers as Record<string, string>)['Content-Type']).toBeUndefined()
  })

  it('attaches the bearer token only when asked', async () => {
    const { fetch, calls } = recordingFetch(() => json(200, {}))
    const client = createApiClient({ baseUrl: 'http://api.test', fetch, getAccessToken: async () => 'tok' })
    await client.request('/public')
    await client.request('/private', { auth: true })
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBeUndefined()
    expect((calls[1].init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
  })

  it('fails with not_authenticated, without calling the server, when there is no token', async () => {
    const { fetch, calls } = recordingFetch(() => json(200, {}))
    const client = createApiClient({ baseUrl: 'http://api.test', fetch, getAccessToken: async () => null })
    const error = await failure(client.request('/private', { auth: true }))
    expect(error.code).toBe('not_authenticated')
    expect(calls).toHaveLength(0)
  })

  it('treats a throwing token getter as signed out', async () => {
    const client = createApiClient({
      baseUrl: 'http://api.test',
      fetch: async () => json(200, {}),
      getAccessToken: async () => {
        throw new Error('login_required')
      },
    })
    expect((await failure(client.request('/private', { auth: true }))).code).toBe('not_authenticated')
  })

  it("turns error bodies into ApiErrors with BE2's codes", async () => {
    const client = createApiClient({ baseUrl: 'http://api.test', fetch: async () => json(409, { detail: 'already_reviewed' }) })
    const error = await failure(client.request('/reviews', { method: 'POST', body: {} }))
    expect(error.status).toBe(409)
    expect(error.code).toBe('already_reviewed')
  })

  it('rejects a 2xx body that does not match the schema', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const client = createApiClient({ baseUrl: 'http://api.test', fetch: async () => json(200, { id: 'not a number' }) })
    const error = await failure(client.request('/items', { schema: z.object({ id: z.number() }) }))
    expect(error.code).toBe('invalid_response')
    warn.mockRestore()
  })

  it('returns null for an empty 204', async () => {
    const client = createApiClient({ baseUrl: 'http://api.test', fetch: async () => new Response(null, { status: 204 }) })
    expect(await client.request('/auth/resend-verification', { method: 'POST' })).toBeNull()
  })

  it('reports network failures as network_error', async () => {
    const client = createApiClient({
      baseUrl: 'http://api.test',
      fetch: async () => {
        throw new TypeError('Failed to fetch')
      },
    })
    expect((await failure(client.request('/x'))).code).toBe('network_error')
  })

  it('times out', async () => {
    const client = createApiClient({ baseUrl: 'http://api.test', fetch: hangingFetch, timeoutMs: 20 })
    const error = await failure(client.request('/slow'))
    expect(error.code).toBe('timeout')
    expect(error.status).toBe(0)
  })

  it('reports a caller abort as aborted', async () => {
    const client = createApiClient({ baseUrl: 'http://api.test', fetch: hangingFetch })
    const controller = new AbortController()
    const pending = failure(client.request('/slow', { signal: controller.signal }))
    controller.abort()
    expect((await pending).code).toBe('aborted')
  })
})
