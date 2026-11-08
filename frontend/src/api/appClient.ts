/**
 * The app's API client: the real server, with the in-browser mock answering
 * for the areas listed in VITE_API_MOCKS. Owner: FE2 (#25).
 * Pages get a client from useApiClient() (src/features/auth), which supplies the access token.
 */
import { env } from '../config/env.ts'
import { createApiClient, type ApiClient } from './client.ts'
import { getMockFetch } from './mock/mockApi.ts'

export function createAppApiClient(getAccessToken?: () => Promise<string | null>): ApiClient {
  return createApiClient({
    baseUrl: env.apiBaseUrl,
    fetch: env.mockDomains.size > 0 ? getMockFetch(env) : undefined,
    getAccessToken,
  })
}
