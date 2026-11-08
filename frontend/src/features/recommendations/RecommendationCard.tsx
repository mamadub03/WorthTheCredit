import { Link } from 'react-router'
import type { Recommendation } from '../../api/recommendations.ts'
import { formatAverage, matchLevelLabel } from '../../domain/reviewVocabulary.ts'
import { paths } from '../../routes/paths.ts'
import styles from './RecommendationCard.module.css'
import { useCourseInsights } from './useCourseInsights.ts'

/**
 * One recommended course, as a match card in the Example B design (#30).
 * Gemini wrote the explanation; every number and skill on the card comes from
 * student reviews in the database. Owner: FE2.
 */
export default function RecommendationCard({ item }: { item: Recommendation }) {
  const { course } = item
  const { insights, loading, failed } = useCourseInsights(course.id, item.reviewCount)
  const titleId = `rec-${course.id}`
  const reviews = `${item.reviewCount} ${item.reviewCount === 1 ? 'review' : 'reviews'}`

  const facts: string[] = []
  if (insights?.averageDifficulty != null) facts.push(`Difficulty ${formatAverage(insights.averageDifficulty)}`)
  if (insights?.mostCommonHours) facts.push(`${insights.mostCommonHours} h/wk`)
  if (item.reviewCount > 0) facts.push(reviews)

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <div className={`${styles.top} ${styles[item.matchLevel]}`}>
        <div className={styles.score}>
          <span className={styles.level}>{matchLevelLabel(item.matchLevel)}</span>
          {item.worthScore === null ? (
            <span className={styles.noScore}>No reviews yet</span>
          ) : (
            <span className={styles.worth}>
              {formatAverage(item.worthScore)}
              <span className={styles.sr}> out of 5 Worth Score, from {reviews}</span>
            </span>
          )}
        </div>
        <span className={styles.code}>{course.code}</span>
      </div>

      <div className={styles.body}>
        <h3 id={titleId} className={styles.title}>
          {course.title}
        </h3>
        <p className={styles.why}>{item.explanation}</p>
        {facts.length > 0 ? <p className={styles.facts}>{facts.join(' · ')}</p> : null}
        {insights && insights.topSkills.length > 0 ? (
          <ul className={styles.skills} aria-label="Skills students gained">
            {insights.topSkills.map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
        ) : null}
        {loading ? <p className={styles.note}>Loading what students reported…</p> : null}
        {failed ? <p className={styles.note}>Student insights didn't load.</p> : null}
        {item.reviewCount === 0 ? <p className={styles.note}>No student reviews yet, so this match rests on the course description.</p> : null}
        {course.prerequisites ? <p className={styles.note}>Prerequisites: {course.prerequisites}. Not checked against your record.</p> : null}
      </div>

      <Link className={styles.view} to={paths.course(course.id)}>
        View course
      </Link>
    </article>
  )
}
