import RecommendationCard from './RecommendationCard.tsx'
import styles from './RecommendationList.module.css'
import type { RecommendationsState } from './useRecommendations.ts'

/** The recommended courses, best match first, as Example B match cards. Owner: FE2 (#30). */
export default function RecommendationList({ state }: { state: RecommendationsState }) {
  if (state.status === 'idle') return null
  if (state.status === 'loading') {
    return (
      <section className={styles.results} aria-live="polite">
        <p className={styles.intro}>Finding courses…</p>
      </section>
    )
  }
  if (state.status === 'error') {
    return (
      <section className={styles.results} role="alert">
        <p className={styles.intro}>{state.error.message}</p>
      </section>
    )
  }

  const { items } = state.result
  return (
    <section className={styles.results} aria-labelledby="results-title">
      <h2 id="results-title" className={styles.title}>
        Your matches
      </h2>
      <p className={styles.intro}>
        {items.length === 1 ? '1 course' : `${items.length} courses`}, strongest first. Gemini explains each match; the scores,
        workload, and skills come from student reviews.
      </p>
      <ol className={styles.grid}>
        {items.map((item) => (
          <li key={item.course.id}>
            <RecommendationCard item={item} />
          </li>
        ))}
      </ol>
      <p className={styles.note}>We can't confirm prerequisites or degree requirements. Check those with your advisor.</p>
    </section>
  )
}
