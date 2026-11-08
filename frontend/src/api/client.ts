/**
 * The HTTP client every page uses. Owner: FE2 (#25); see docs/frontend-coordination.md section 6.
 *
 * - Joins the API base URL and path, adds query parameters, sends and parses JSON.
 * - Attaches the Auth0 access token only when a call passes `auth: true`.
 * - Times out (15 s by default) and honours the caller's AbortSignal.
 * - Checks 2xx bodies against a zod schema, and turns every failure into an ApiError.
 */
import type { z } from 'zod'
import { ApiError, errorFromResponse } from './errors.ts'

export type QueryValue = string | number | boolean | null | undefined
export type FetchLike = (input: string, init: RequestInit) => Promise<Response>

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  query?: Record<string, QueryValue>
  body?: unknown
  /** Attach the signed-in student's access token. */
  auth?: boolean
  signal?: AbortSignal
  timeoutMs?: number
}

export interface ApiClient {
  /** With a schema: resolves to the parsed (and transformed) body, or rejects with `invalid_response`. */
  request<S extends z.ZodType>(path: string, options: RequestOptions & { schema: S }): Promise<z.output<S>>
  /** Without a schema: resolves to the raw JSON body, or null for an empty one (such as a 204). */
  request(path: string, options?: RequestOptions): Promise<unknown>
}

export interface ApiClientOptions {
  baseUrl: string
  fetch?: FetchLike
  getAccessToken?: () => Promise<string | null>
  timeoutMs?: number
}

export const DEFAULT_TIMEOUT_MS = 15_000

export function buildUrl(baseUrl: string, path: string, query?: Record<string, QueryValue>): string {
  const base = baseUrl.replace(/\/+$/, '')
  const suffix = path.startsWith('/') ? path : `/${path}`
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, String(value))
  }
  const search = params.toString()
  return `${base}${suffix}${search ? `?${search}` : ''}`
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const send: FetchLike = options.fetch ?? ((input, init) => fetch(input, init))
  const defaultTimeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS

  async function request(path: string, opts: RequestOptions & { schema?: z.ZodType } = {}): Promise<unknown> {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
    if (opts.auth) {
      let token: string | null = null
      try {
        token = options.getAccessToken ? await options.getAccessToken() : null
      } catch {
        token = null
      }
      if (!token) throw new ApiError(401, 'not_authenticated')
      headers.Authorization = `Bearer ${token}`
    }

    const controller = new AbortController()
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, opts.timeoutMs ?? defaultTimeout)
    const forwardAbort = () => controller.abort()
    if (opts.signal?.aborted) controller.abort()
    opts.signal?.addEventListener('abort', forwardAbort, { once: true })

    try {
      const response = await send(buildUrl(options.baseUrl, path, opts.query), {
        method: opts.method ?? 'GET',
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        signal: controller.signal,
      })
      const body = await readBody(response)
      if (!response.ok) throw errorFromResponse(response.status, body)
      if (!opts.schema) return body
      const parsed = opts.schema.safeParse(body)
      if (!parsed.success) {
        if (import.meta.env.DEV) console.warn(`Unexpected response from ${path}`, parsed.error.issues)
        throw new ApiError(response.status, 'invalid_response')
      }
      return parsed.data
    } catch (error) {
      if (error instanceof ApiError) throw error
      if (timedOut) throw new ApiError(0, 'timeout')
      if (opts.signal?.aborted) throw new ApiError(0, 'aborted')
      throw new ApiError(0, 'network_error')
    } finally {
      clearTimeout(timer)
      opts.signal?.removeEventListener('abort', forwardAbort)
    }
  }

  return { request } as ApiClient
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (text === '') return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}
