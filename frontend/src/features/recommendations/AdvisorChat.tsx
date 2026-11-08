import { Fragment, useState, type KeyboardEvent } from 'react'
import Button from '../../components/form/Button.tsx'
import styles from './AdvisorChat.module.css'
import { FOLLOW_UPS, GREETING, type Exchange } from './chatModel.ts'
import RecommendationCard from './RecommendationCard.tsx'
import type { AdvisorChat as AdvisorChatState } from './useAdvisorChat.ts'

interface AdvisorChatProps {
  chat: AdvisorChatState
  /** Sends what the student typed or the follow-up they picked. */
  onAsk: (text: string) => void
}

/**
 * The course advisor chat in the Example B AI match layout (#31): the
 * student's turns, Gemini's matches as cards, follow-ups, and a message box.
 * Owner: FE2.
 */
export default function AdvisorChat({ chat, onAsk }: AdvisorChatProps) {
  const [draft, setDraft] = useState('')
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
    <section className={styles.panel} aria-label="Chat with the course advisor">
      <header className={styles.head}>
        <span className={styles.avatar} aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#1E2124">
            <path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z" />
          </svg>
        </span>
        <div className={styles.who}>
          <strong>Course advisor</strong>
          <span>Powered by Gemini · uses the RIT catalog and student reviews</span>
        </div>
        {chat.exchanges.length > 0 ? (
          <Button variant="quiet" size="small" onClick={chat.reset}>
            New chat
          </Button>
        ) : null}
      </header>

      <ol className={styles.log} role="log" aria-live="polite" aria-label="Conversation">
        <li className={styles.advisor}>{GREETING}</li>
        {chat.exchanges.map((exchange) => (
          <Fragment key={exchange.id}>
            <li className={styles.student}>
              <span className={styles.sr}>You said: </span>
              {exchange.said}
            </li>
            <li className={styles.answer}>
              <Answer exchange={exchange} onRetry={() => chat.retry(exchange.id)} />
            </li>
          </Fragment>
        ))}
      </ol>

      {last?.state.status === 'done' ? (
        <div className={styles.followUps} aria-label="Follow-up ideas">
          {FOLLOW_UPS.map((followUp) => (
            <button key={followUp} type="button" className={styles.chip} onClick={() => ask(followUp)} disabled={chat.busy}>
              {followUp}
            </button>
          ))}
        </div>
      ) : null}

      <form
        className={styles.composer}
        onSubmit={(event) => {
          event.preventDefault()
          ask(draft)
        }}
      >
        <label htmlFor="advisor-message" className={styles.sr}>
          Message the course advisor
        </label>
        <textarea
          id="advisor-message"
          rows={2}
          value={draft}
          maxLength={300}
          placeholder="Ask anything, like “something with less than 6 hours a week”"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
        />
        {chat.busy ? (
          <Button variant="secondary" onClick={chat.stop}>
            Stop
          </Button>
        ) : (
          <Button type="submit" disabled={!draft.trim()}>
            Send
          </Button>
        )}
      </form>
    </section>
  )
}

function Answer({ exchange, onRetry }: { exchange: Exchange; onRetry: () => void }) {
  const { state } = exchange
  if (state.status === 'loading') {
    return (
      <div className={styles.bubble}>
        <span className={styles.typing} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span>Finding courses…</span>
      </div>
    )
  }
  if (state.status === 'failed') {
    return (
      <div className={styles.bubble} role="alert">
        <p>{state.message}</p>
        <Button variant="secondary" size="small" onClick={onRetry}>
          Try again
        </Button>
      </div>
    )
  }
  const { items, droppedCount } = state.result
  if (items.length === 0) {
    return (
      <div className={styles.bubble}>
        <p>I couldn't find a good match for that yet. Try adding an interest or a career goal in About you.</p>
      </div>
    )
  }
  return (
    <div className={styles.bubble}>
      <p>{items.length === 1 ? 'Here is 1 course:' : `Here are ${items.length} courses, strongest first:`}</p>
      <ol className={styles.cards}>
        {items.map((item) => (
          <li key={item.course.id}>
            <RecommendationCard item={item} />
          </li>
        ))}
      </ol>
      {droppedCount > 0 ? <p className={styles.fine}>I left out {droppedCount} suggestion{droppedCount === 1 ? '' : 's'} that didn't check out.</p> : null}
      <p className={styles.fine}>I can't confirm prerequisites or degree requirements. Check those with your advisor.</p>
    </div>
  )
}
