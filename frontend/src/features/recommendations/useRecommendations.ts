/**
 * One recommendation request at a time: a new one cancels the last, and
 * leaving the page cancels whatever is in flight. Owner: FE2 (#29, #31).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, isApiError } from '../../api/errors.ts'
import { getRecommendations, type RecommendationRequest, type RecommendationResult } from '../../api/recommendations.ts'
import { useApiClient } from '../auth/useApiClient.ts'

export type RecommendationsState =
  | { status: 'idle' }
  | { status: 'loading'; startedAt: number }
  | { status: 'success'; result: RecommendationResult; request: RecommendationRequest }
  | { status: 'error'; error: ApiError }

export function useRecommendations() {
  const client = useApiClient()
  const [state, setState] = useState<RecommendationsState>({ status: 'idle' })
  const inFlight = useRef<AbortController | null>(null)

  useEffect(() => () => inFlight.current?.abort(), [])

  const request = useCallback(
    async (body: RecommendationRequest) => {
      inFlight.current?.abort()
      const controller = new AbortController()
      inFlight.current = controller
      setState({ status: 'loading', startedAt: Date.now() })
      try {
        const result = await getRecommendations(client, body, controller.signal)
        if (!controller.signal.aborted) setState({ status: 'success', result, request: body })
      } catch (error) {
        if (!controller.signal.aborted) setState({ status: 'error', error: isApiError(error) ? error : new ApiError(0, 'server_error') })
      }
    },
    [client],
  )

  const cancel = useCallback(() => {
    inFlight.current?.abort()
    setState({ status: 'idle' })
  }, [])

  return { state, request, cancel }
}
