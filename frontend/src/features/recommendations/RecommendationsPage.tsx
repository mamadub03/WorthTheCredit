import { useAuth } from '../auth/authContext.ts'
import RequireAuth from '../auth/RequireAuth.tsx'
import AboutYouCard from './AboutYouCard.tsx'
import AdvisorChat from './AdvisorChat.tsx'
import { profileSentence, requestFor } from './chatModel.ts'
import styles from './RecommendationsPage.module.css'
import { useAdvisorChat } from './useAdvisorChat.ts'
import { useProfileForm } from './useProfileForm.ts'

/**
 * /recommendations, the AI match page on the College carousel boards
 * (Carousel-AI and Carousel-PhoneAI): the "About you" panel beside a chat with
 * the course advisor. The boards draw no visible page title, so the h1 is for
 * screen readers only. Needs a signed-in student. Owner: FE2 (#29 to #31).
 */
export default function RecommendationsPage() {
  return (
    <RequireAuth>
      <Advisor />
    </RequireAuth>
  )
}

function Advisor() {
  const auth = useAuth()
  const sub = auth.user?.sub ?? null
  const form = useProfileForm(sub)
  const chat = useAdvisorChat(sub)

  function matchFromProfile() {
    const checked = form.validate()
    if (checked.ok) chat.send(profileSentence(form.values), checked.request)
  }

  function ask(text: string) {
    chat.send(text.trim(), requestFor(form.values, text))
  }

  return (
    <div className={styles.page}>
      <h1 className="wtc-sr">Your personal course advisor</h1>
      <AboutYouCard form={form} busy={chat.busy} onMatch={matchFromProfile} />
      <AdvisorChat chat={chat} onAsk={ask} />
    </div>
  )
}
