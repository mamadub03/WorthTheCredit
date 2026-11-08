/**
 * The AI match conversation's state: one request at a time, retry and stop,
 * and the finished turns kept in sessionStorage so coming Back from a course
 * page shows the same answers without another Gemini call. Logout clears it.
 * Owner: FE2 (#31).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, isApiError } from '../../api/errors.ts'
import { getRecommendations, type RecommendationRequest } from '../../api/recommendations.ts'
import { readStored, userKey, writeStored } from '../auth/appStorage.ts'
import { useApiClient } from '../auth/useApiClient.ts'
import { failureMessage, type Exchange } from './chatModel.ts'

export function chatKey(sub: string): string {
  return userKey(sub, 'advisor-chat')
}

function savedChat(sub: string | null): Exchange[] {
  const saved = sub ? readStored<Exchange[]>(chatKey(sub)) : null
  return Array.isArray(saved) ? saved.filter((exchange) => exchange?.state?.status === 'done') : []
}

function newId(): string {
  return typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`
}

export interface AdvisorChat {
  exchanges: Exchange[]
  busy: boolean
  send(said: string, request: RecommendationRequest): void
  retry(id: string): void
  stop(): void
  reset(): void
}

export function useAdvisorChat(sub: string | null): AdvisorChat {
  const client = useApiClient()
  const [exchanges, setExchanges] = useState<Exchange[]>(() => savedChat(sub))
  const inFlight = useRef<AbortController | null>(null)

  useEffect(() => () => inFlight.current?.abort(), [])

  useEffect(() => {
    if (sub) writeStored(chatKey(sub), exchanges.filter((exchange) => exchange.state.status === 'done'))
  }, [sub, exchanges])

  const run = useCallback(
    async (id: string, request: RecommendationRequest) => {
      inFlight.current?.abort()
      const controller = new AbortController()
      inFlight.current = controller
      const settle = (state: Exchange['state']) =>
        setExchanges((current) => current.map((exchange) => (exchange.id === id ? { ...exchange, state } : exchange)))
      try {
        const result = await getRecommendations(client, request, controller.signal)
        if (!controller.signal.aborted) settle({ status: 'done', result })
      } catch (error) {
        if (controller.signal.aborted) return
        const problem = isApiError(error) ? error : new ApiError(0, 'server_error')
        settle({ status: 'failed', message: failureMessage(problem), code: problem.code })
      }
    },
    [client],
  )

  const send = useCallback(
    (said: string, request: RecommendationRequest) => {
      const id = newId()
      setExchanges((current) => [...current, { id, said, request, state: { status: 'loading' } }])
      void run(id, request)
    },
    [run],
  )

  const retry = useCallback(
    (id: string) => {
      const exchange = exchanges.find((item) => item.id === id)
      if (!exchange) return
      setExchanges((current) => current.map((item) => (item.id === id ? { ...item, state: { status: 'loading' } } : item)))
      void run(id, exchange.request)
    },
    [exchanges, run],
  )

  const stop = useCallback(() => {
    inFlight.current?.abort()
    setExchanges((current) =>
      current.map((item) => (item.state.status === 'loading' ? { ...item, state: { status: 'failed', message: 'Stopped.', code: 'aborted' } } : item)),
    )
  }, [])

  const reset = useCallback(() => {
    inFlight.current?.abort()
    setExchanges([])
  }, [])

  return { exchanges, busy: exchanges.some((item) => item.state.status === 'loading'), send, retry, stop, reset }
}
