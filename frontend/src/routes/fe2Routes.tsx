import { Route } from 'react-router'
import AuthCallbackPage from '../features/auth/AuthCallbackPage.tsx'
import WriteReviewPage from '../features/reviewForm/WriteReviewPage.tsx'
import { paths } from './paths.ts'

/**
 * FE2's routes, rendered inside FE1's <Routes> in App.tsx as {fe2Routes()}
 * (docs/frontend-coordination.md section 3). Each feature branch adds its
 * route at its own marker, so the branches don't conflict. Owner: FE2.
 */
export function fe2Routes() {
  return (
    <>
      <Route path={paths.writeReview()} element={<WriteReviewPage />} />
      {/* #27 and #28: review form route */}
      <Route path={paths.authCallback} element={<AuthCallbackPage />} />
      {/* #29 to #31: the recommendations route goes here */}
    </>
  )
}
