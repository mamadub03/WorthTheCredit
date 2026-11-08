/**
 * Loads data with the page's API client and tracks loading, success and error.
 * The request reruns when `key` changes and is cancelled when the page unmounts,
 * so a slow response never overwrites a newer one. Nothing is cached: each
 * mount loads fresh, so a new review shows up right away (coordination doc §2).
 * Owner: FE1 (#23).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ApiClient } from '../api/client.ts'
import { isApiError, type ApiError } from '../api/errors.ts'
import { useApiClient } from '../features/auth/useApiClient.ts'

export type QueryState<T> =
  | { status: 'loading'; data: null; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'error'; data: null; error: ApiError | Error }

export interface QueryResult<T> {
  state: QueryState<T>
  retry: () => void
}

type Settled<T> = { requestId: string } & ({ status: 'success'; data: T } | { status: 'error'; error: Error })

const LOADING = { status: 'loading', data: null, error: null } as const

export function useApiQuery<T>(
  /** What's being loaded. A new key loads again; null loads nothing. */
  key: string | null,
  load: (client: ApiClient, signal: AbortSignal) => Promise<T>,
): QueryResult<T> {
  const client = useApiClient()
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled<T> | null>(null)
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })

  const requestId = `${key}#${attempt}`

  useEffect(() => {
    if (key === null) return
    const controller = new AbortController()
    loadRef.current(client, controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setSettled({ requestId, status: 'success', data })
      },
      (error: unknown) => {
        if (controller.signal.aborted) return
        setSettled({ requestId, status: 'error', error: error instanceof Error ? error : new Error(String(error)) })
      },
    )
    return () => controller.abort()
  }, [client, key, requestId])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  // Anything settled for an older key or attempt counts as still loading.
  let state: QueryState<T> = LOADING
  if (settled && settled.requestId === requestId) {
    state = settled.status === 'success' ? { status: 'success', data: settled.data, error: null } : { status: 'error', data: null, error: settled.error }
  }
  return { state, retry }
}

/**
 * True when the API said the thing doesn't exist. A malformed id in the URL
 * (not a UUID) comes back as a 422 from FastAPI's path check, which means the
 * same thing to a student following an old or mistyped link.
 */
export function isNotFound(error: unknown): boolean {
  return isApiError(error) && (error.status === 404 || error.status === 422)
}

/** A message that's safe to show a student. */
export function errorMessage(error: unknown): string {
  if (isApiError(error)) return error.message
  return 'Something went wrong. Please try again.'
}
