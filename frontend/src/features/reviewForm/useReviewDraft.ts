/**
 * Keeps the student's unfinished answers in sessionStorage, so an Auth0
 * redirect (sign-in expired, verifying the email in another tab) doesn't wipe
 * the form. Logout clears it with every other per-student key. Owner: FE2 (#28).
 */
import { useEffect, useRef } from 'react'
import { readStored, removeStored, userKey, writeStored } from '../auth/appStorage.ts'
import type { ReviewFormValues } from './reviewFormModel.ts'

const DRAFT = 'review-draft'

export function useReviewDraft(
  sub: string | null,
  values: ReviewFormValues,
  restore: (values: ReviewFormValues) => void,
  { urlCourseId, finished }: { urlCourseId: string | null; finished: boolean },
) {
  const restored = useRef(false)

  // Restore once per page, unless the link names a different course than the draft.
  useEffect(() => {
    if (!sub || restored.current) return
    restored.current = true
    const saved = readStored<ReviewFormValues>(userKey(sub, DRAFT))
    if (saved && Array.isArray(saved.goals) && (urlCourseId === null || saved.courseId === urlCourseId)) restore(saved)
  }, [sub, urlCourseId, restore])

  useEffect(() => {
    if (!sub || !restored.current) return
    if (finished) removeStored(userKey(sub, DRAFT))
    else writeStored(userKey(sub, DRAFT), values)
  }, [sub, values, finished])
}

export function draftKey(sub: string): string {
  return userKey(sub, DRAFT)
}
