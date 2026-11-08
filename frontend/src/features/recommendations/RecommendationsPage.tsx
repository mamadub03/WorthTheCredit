import { useAuth } from '../auth/authContext.ts'
import RequireAuth from '../auth/RequireAuth.tsx'
import ProfileForm from './ProfileForm.tsx'
import RecommendationList from './RecommendationList.tsx'
import styles from './RecommendationsPage.module.css'
import { useProfileForm } from './useProfileForm.ts'
import { useRecommendations } from './useRecommendations.ts'

/** /recommendations: the personalization form and its results. Needs a signed-in student. Owner: FE2 (#29). */
export default function RecommendationsPage() {
  return (
    <RequireAuth>
      <Recommendations />
    </RequireAuth>
  )
}

function Recommendations() {
  const auth = useAuth()
  const form = useProfileForm(auth.user?.sub ?? null)
  const { state, request } = useRecommendations()

  function onSubmit() {
    const checked = form.validate()
    if (checked.ok) void request(checked.request)
  }

  return (
    <div className={styles.page}>
      <ProfileForm form={form} busy={state.status === 'loading'} onSubmit={onSubmit} />
      <RecommendationList state={state} />
    </div>
  )
}
