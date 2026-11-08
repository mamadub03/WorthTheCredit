/**
 * The API client for the current page, carrying the signed-in student's token.
 * Owner: FE2 (#26). FE1 can use it too; public calls simply don't pass `auth: true`.
 */
import { createContext, useContext, useMemo } from 'react'
import { createAppApiClient } from '../../api/appClient.ts'
import type { ApiClient } from '../../api/client.ts'
import { useAuth } from './authContext.ts'

/** Lets tests hand pages a client of their own (for example one backed by the mock API). */
export const ApiClientOverride = createContext<ApiClient | null>(null)

export function useApiClient(): ApiClient {
  const override = useContext(ApiClientOverride)
  const { getAccessToken } = useAuth()
  const client = useMemo(() => createAppApiClient(getAccessToken), [getAccessToken])
  return override ?? client
}
