import { Link } from 'react-router'
import { matchLevelLabel } from '../../domain/reviewVocabulary.ts'
import { paths } from '../../routes/paths.ts'
import type { RecommendationsState } from './useRecommendations.ts'

/** The recommended courses, best match first. Owner: FE2 (#29; full cards in #30). */
export default function RecommendationList({ state }: { state: RecommendationsState }) {
  if (state.status === 'idle') return null
  if (state.status === 'loading') {
    return (
      <section className="panel" aria-live="polite">
        <p>Finding courses…</p>
      </section>
    )
  }
  if (state.status === 'error') {
    return (
      <section className="panel" role="alert">
        <p>{state.error.message}</p>
      </section>
    )
  }
  return (
    <section className="panel" aria-labelledby="results-title">
      <h2 id="results-title">Your matches</h2>
      <ol>
        {state.result.items.map((item) => (
          <li key={item.course.id}>
            <Link to={paths.course(item.course.id)}>
              {item.course.code} {item.course.title}
            </Link>{' '}
            · {matchLevelLabel(item.matchLevel)}
          </li>
        ))}
      </ol>
    </section>
  )
}
