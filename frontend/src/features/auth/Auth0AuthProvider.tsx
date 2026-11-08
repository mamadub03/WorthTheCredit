import { Auth0Provider, useAuth0, type AppState } from '@auth0/auth0-react'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import type { Auth0Config } from '../../config/env.ts'
import { paths } from '../../routes/paths.ts'
import { clearAppStorage } from './appStorage.ts'
import { needsSignIn, toAuthUser } from './auth0User.ts'
import { AuthContext, type AuthValue, type SignInOptions } from './authContext.ts'

/**
 * Real sign-in through Auth0 Universal Login. Owner: FE2 (#26).
 * The tenant needs a single-page app with callback http://localhost:5173/callback,
 * refresh-token rotation, and an API whose identifier is VITE_AUTH0_AUDIENCE
 * (docs/frontend-coordination.md section 9).
 *
 * Refresh tokens cached in localStorage keep students signed in across reloads
 * in browsers that block third-party cookies (Safari, Brave).
 */
export default function Auth0AuthProvider({ config, children }: { config: Auth0Config; children: ReactNode }) {
  const navigate = useNavigate()
  const onRedirectCallback = useCallback(
    (appState?: AppState) => {
      navigate(appState?.returnTo ?? paths.home, { replace: true })
    },
    [navigate],
  )

  return (
    <Auth0Provider
      domain={config.domain}
      clientId={config.clientId}
      authorizationParams={{ audience: config.audience, redirect_uri: `${window.location.origin}${paths.authCallback}` }}
      useRefreshTokens
      cacheLocation="localstorage"
      onRedirectCallback={onRedirectCallback}
    >
      <Auth0Bridge>{children}</Auth0Bridge>
    </Auth0Provider>
  )
}

/** Maps the Auth0 SDK onto the app's AuthValue. Exported for tests. */
export function Auth0Bridge({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, user, error, loginWithRedirect, logout: auth0Logout, getAccessTokenSilently, getIdTokenClaims } =
    useAuth0()
  const location = useLocation()
  const here = location.pathname + location.search
  const [justLoggedOut, setJustLoggedOut] = useState(false)

  const login = useCallback(
    (options?: SignInOptions) => {
      setJustLoggedOut(false)
      return loginWithRedirect({ appState: { returnTo: options?.returnTo ?? here } })
    },
    [loginWithRedirect, here],
  )

  const signup = useCallback(
    (options?: SignInOptions) => {
      setJustLoggedOut(false)
      return loginWithRedirect({ appState: { returnTo: options?.returnTo ?? here }, authorizationParams: { screen_hint: 'signup' } })
    },
    [loginWithRedirect, here],
  )

  // Without the flag, a guarded page re-renders signed out and starts a login redirect that races this logout redirect.
  const logout = useCallback(async () => {
    clearAppStorage()
    setJustLoggedOut(true)
    await auth0Logout({ logoutParams: { returnTo: window.location.origin } })
  }, [auth0Logout])

  const getAccessToken = useCallback(async () => {
    try {
      return (await getAccessTokenSilently()) ?? null
    } catch (problem) {
      if (needsSignIn(problem)) return null
      throw problem
    }
  }, [getAccessTokenSilently])

  // A fresh token round trip makes Auth0 reissue the ID token, so email_verified updates.
  const refreshUser = useCallback(async () => {
    try {
      await getAccessTokenSilently({ cacheMode: 'off' })
    } catch (problem) {
      if (needsSignIn(problem)) return null
      throw problem
    }
    return toAuthUser(await getIdTokenClaims())
  }, [getAccessTokenSilently, getIdTokenClaims])

  const value = useMemo<AuthValue>(
    () => ({
      mode: 'auth0',
      isLoading,
      isAuthenticated,
      user: isAuthenticated ? toAuthUser(user) : null,
      error: error ?? null,
      justLoggedOut,
      login,
      signup,
      logout,
      getAccessToken,
      refreshUser,
    }),
    [isLoading, isAuthenticated, user, error, justLoggedOut, login, signup, logout, getAccessToken, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
