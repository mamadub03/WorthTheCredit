import { Route } from 'react-router'
import AuthCallbackPage from '../features/auth/AuthCallbackPage.tsx'
import RecommendationsPage from '../features/recommendations/RecommendationsPage.tsx'
import WriteReviewPage from '../features/reviewForm/WriteReviewPage.tsx'
import { paths } from './paths.ts'

/**
 * FE2's routes, rendered inside FE1's <Routes> in App.tsx as {fe2Routes()}
 * (docs/frontend-coordination.md section 3). Owner: FE2.
 */
export function fe2Routes() {
  return (
    <>
      <Route path={paths.writeReview()} element={<WriteReviewPage />} />
      <Route path={paths.recommendations} element={<RecommendationsPage />} />
      <Route path={paths.authCallback} element={<AuthCallbackPage />} />
    </>
  )
}
