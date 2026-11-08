/**
 * A course's reviews, newest first, one page at a time, with "load more".
 * Loads fresh on every mount so a just-posted review appears. Owner: FE1 (#22, #23).
 */
import { useCallback, useEffect, useState } from 'react'
import { listReviews, type Review } from '../api/reviews.ts'
import { useApiClient } from '../features/auth/useApiClient.ts'

export const REVIEW_PAGE = 50

export interface CourseReviews {
  status: 'loading' | 'success' | 'error'
  reviews: Review[]
  total: number
  loadingMore: boolean
  error: Error | null
  loadMore: () => void
  retry: () => void
}

interface Loaded {
  requestId: string
  status: 'success' | 'error'
  reviews: Review[]
  total: number
  error: Error | null
}

export function useCourseReviews(courseId: string): CourseReviews {
  const client = useApiClient()
  const [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const requestId = `${courseId}#${attempt}`

  useEffect(() => {
    const controller = new AbortController()
    listReviews(client, courseId, { limit: REVIEW_PAGE, offset: 0 }, controller.signal).then(
      (page) => {
        if (!controller.signal.aborted) setLoaded({ requestId, status: 'success', reviews: page.results, total: page.total, error: null })
      },
      (failure: unknown) => {
        if (controller.signal.aborted) return
        setLoaded({ requestId, status: 'error', reviews: [], total: 0, error: failure instanceof Error ? failure : new Error(String(failure)) })
      },
    )
    return () => controller.abort()
  }, [client, courseId, requestId])

  const current = loaded && loaded.requestId === requestId ? loaded : null
  const reviews = current?.reviews ?? []

  const loadMore = useCallback(() => {
    if (loadingMore || !current) return
    setLoadingMore(true)
    listReviews(client, courseId, { limit: REVIEW_PAGE, offset: current.reviews.length }).then(
      (page) => {
        setLoaded((previous) =>
          previous && previous.requestId === requestId
            ? {
                ...previous,
                reviews: [...previous.reviews, ...page.results.filter((review) => !previous.reviews.some((seen) => seen.id === review.id))],
                total: page.total,
              }
            : previous,
        )
        setLoadingMore(false)
      },
      () => setLoadingMore(false),
    )
  }, [client, courseId, current, loadingMore, requestId])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  return {
    status: current ? current.status : 'loading',
    reviews,
    total: current?.total ?? 0,
    loadingMore,
    error: current?.error ?? null,
    loadMore,
    retry,
  }
}
