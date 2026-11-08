/**
 * Account calls. Owner: FE2 (#26).
 */
import type { ApiClient } from './client.ts'

/**
 * Asks Auth0, through BE2's API, to send the verification email again.
 * Resolves on 204. Fails with rate_limited (429, once a minute), auth0_error (502),
 * or not_configured (503) when the backend has no Auth0 machine credentials.
 */
export async function resendVerificationEmail(client: ApiClient, signal?: AbortSignal): Promise<void> {
  await client.request('/auth/resend-verification', { method: 'POST', auth: true, signal })
}
