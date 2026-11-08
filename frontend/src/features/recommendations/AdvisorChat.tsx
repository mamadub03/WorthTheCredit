import { Fragment, useState, useSyncExternalStore, type KeyboardEvent } from 'react'
import markUrl from '../../assets/brand/mark.svg'
import Button from '../../components/form/Button.tsx'
import { ArrowRightIcon, RetryIcon } from '../../components/ui/icons.tsx'
import styles from './AdvisorChat.module.css'
import { FOLLOW_UPS, GREETING, GREETING_SHORT, type Exchange } from './chatModel.ts'
import RecommendationCard from './RecommendationCard.tsx'
import type { AdvisorChat as AdvisorChatState } from './useAdvisorChat.ts'

interface AdvisorChatProps {
  chat: AdvisorChatState
  /** Sends what the student typed or the follow-up they picked. */
  onAsk: (text: string) => void
}

/** Matches the CSS modules' phone breakpoint. */
const PHONE_QUERY = '(max-width: 640px)'

function subscribePhone(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  const list = window.matchMedia(PHONE_QUERY)
  list.addEventListener('change', onChange)
  return () => list.removeEventListener('change', onChange)
}

function isPhone(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(PHONE_QUERY).matches
}

/** The composer's placeholder and height differ on a phone, which CSS alone can't change. */
function usePhone(): boolean {
  return useSyncExternalStore(subscribePhone, isPhone, () => false)
}

/**
 * The course advisor chat on the College carousel AI boards (#31): the
 * advisor header, the student's turns, Gemini's matches as cards inside a
 * peach results bubble, follow-up chips, and the composer with its orange
 * send button. On a phone the white card drops away, the conversation sits on
 * the cream page, and the chips and composer stay pinned above the tab bar.
 * Owner: FE2.
 */
export default function AdvisorChat({ chat, onAsk }: AdvisorChatProps) {
  const [draft, setDraft] = useState('')
  const phone = usePhone()
  const last = chat.exchanges[chat.exchanges.length - 1]

  function ask(text: string) {
    if (!text.trim() || chat.busy) return
    onAsk(text)
    setDraft('')
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      ask(draft)
    }
  }

  return (
    <section className={`${styles.panel} wtc-rise wtc-d1`} aria-label="Chat with the course advisor">
      <header className={styles.head}>
        <img className={styles.avatar} src={markUrl} alt="" width={44} height={44} />
        <div className={styles.who}>
          <h2 className={styles.name}>Course advisor</h2>
          <p className={styles.sub}>
            <span className={styles.wide}>Powered by Gemini · uses the RIT catalog and student reviews</span>
            <span className={styles.narrow}>RIT catalog + student reviews</span>
          </p>
        </div>
        {chat.exchanges.length > 0 ? (
          <Button variant="dark" className={styles.newChat} onClick={chat.reset} aria-label="New chat" title="New chat">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Button>
        ) : null}
      </header>

      <ol className={styles.log} role="log" aria-live="polite" aria-label="Conversation">
        <li className={`${styles.advisor} wtc-rise`}>
          <span className={styles.wide}>{GREETING}</span>
          <span className={styles.narrow}>{GREETING_SHORT}</span>
        </li>
        {chat.exchanges.map((exchange) => (
          <Fragment key={exchange.id}>
            <li className={`${styles.student} wtc-rise`}>
              <span className="wtc-sr">You said: </span>
              {exchange.said}
            </li>
            <li className={styles.answer}>
              <Answer exchange={exchange} onRetry={() => chat.retry(exchange.id)} />
            </li>
          </Fragment>
        ))}
      </ol>

      <div className={styles.dock}>
        {last?.state.status === 'done' ? (
          <div className={styles.followUps} role="group" aria-labelledby="advisor-follow-ups">
            <p id="advisor-follow-ups" className={styles.prompt}>
              <span className={styles.wide}>Want me to adjust? Try one of these:</span>
              <span className={styles.narrow}>Want me to adjust?</span>
            </p>
            <div className={styles.chips}>
              {FOLLOW_UPS.map((followUp) => (
                <button key={followUp} type="button" className={styles.chip} onClick={() => ask(followUp)} disabled={chat.busy}>
                  {followUp}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <form
          className={styles.composer}
          onSubmit={(event) => {
            event.preventDefault()
            ask(draft)
          }}
        >
          <label htmlFor="advisor-message" className="wtc-sr">
            Message the course advisor
          </label>
          <textarea
            id="advisor-message"
            rows={phone ? 1 : 2}
            value={draft}
            maxLength={300}
            placeholder={phone ? 'Ask a follow-up…' : 'Ask a follow-up, like “something under 6 hours a week”'}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
          />
          {chat.busy ? (
            <Button variant="dark" className={styles.send} onClick={chat.stop} aria-label="Stop" title="Stop">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
                <rect x="5" y="5" width="14" height="14" rx="3" />
              </svg>
            </Button>
          ) : (
            <Button type="submit" className={styles.send} disabled={!draft.trim()} aria-label="Send" title="Send">
              <ArrowRightIcon size={phone ? 18 : 20} />
            </Button>
          )}
        </form>
      </div>
    </section>
  )
}

function Answer({ exchange, onRetry }: { exchange: Exchange; onRetry: () => void }) {
  const { state } = exchange
  if (state.status === 'loading') {
    return (
      <div className={`${styles.typingRow} wtc-rise`}>
        <span className={styles.dots} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span className={styles.prompt}>Finding courses…</span>
      </div>
    )
  }
  if (state.status === 'failed') {
    return (
      <div className={`${styles.bubble} ${styles.problem} wtc-rise`} role="alert">
        <p>{state.message}</p>
        <Button variant="secondary" size="small" className={styles.retry} onClick={onRetry}>
          <RetryIcon size={16} />
          Try again
        </Button>
      </div>
    )
  }
  const { items, droppedCount } = state.result
  if (items.length === 0) {
    return (
      <div className={`${styles.bubble} ${styles.plain} wtc-rise`}>
        <p>I couldn't find a good match for that yet. Try adding an interest or a career goal in About you.</p>
      </div>
    )
  }
  return (
    <div className={`${styles.bubble} ${styles.results} wtc-rise`}>
      <p className={styles.lead}>{items.length === 1 ? 'Here is 1 course:' : `Here are ${items.length} courses, strongest first:`}</p>
      <ol className={styles.cards}>
        {items.map((item) => (
          <li key={item.course.id}>
            <RecommendationCard item={item} />
          </li>
        ))}
      </ol>
      {droppedCount > 0 ? (
        <p className={styles.fine}>
          I left out {droppedCount} suggestion{droppedCount === 1 ? '' : 's'} that didn't check out.
        </p>
      ) : null}
      <p className={styles.fine}>I can’t confirm prerequisites or degree requirements. Check those with your academic advisor.</p>
    </div>
  )
}
