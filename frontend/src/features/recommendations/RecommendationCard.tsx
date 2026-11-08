import type { Recommendation } from '../../api/recommendations.ts'
import ButtonLink from '../../components/form/ButtonLink.tsx'
import CapsMeter from '../../components/ui/CapsMeter.tsx'
import { reviewCountLabel } from '../../components/ui/format.ts'
import { ClockIcon } from '../../components/ui/icons.tsx'
import { hoursShort } from '../../domain/goalStyles.ts'
import { formatAverage, matchLevelLabel, weeklyHoursLabel } from '../../domain/reviewVocabulary.ts'
import { paths } from '../../routes/paths.ts'
import styles from './RecommendationCard.module.css'
import { useCourseInsights } from './useCourseInsights.ts'

/**
 * One recommended course as the College carousel AI board's match card (#30):
 * a tinted top with the match level, the Worth number and the course code,
 * then the title, Gemini's explanation, concept difficulty as caps and the
 * most common weekly hours, and "View course". Gemini wrote the explanation;
 * every number and skill on the card comes from student reviews in the
 * database. On a phone the tint carries "CODE · Title" and the number moves
 * to its right, as the phone board draws it. Owner: FE2.
 */
export default function RecommendationCard({ item }: { item: Recommendation }) {
  const { course } = item
  const { insights, loading, failed } = useCourseInsights(course.id, item.reviewCount)
  const titleId = `rec-${course.id}`
  const difficulty = insights?.averageDifficulty ?? null
  const hours = insights?.mostCommonHours ?? null

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <div className={`${styles.tint} ${styles[item.matchLevel]}`}>
        <span className={styles.level}>{matchLevelLabel(item.matchLevel)}</span>
        {item.worthScore === null ? (
          <span className={styles.noScore}>No reviews yet</span>
        ) : (
          <span className={styles.worth}>
            <span className="wtc-sr">Worth Score </span>
            {formatAverage(item.worthScore)}
            <span className="wtc-sr"> out of 5, from {reviewCountLabel(item.reviewCount)}</span>
          </span>
        )}
        <span className={styles.code}>{course.code}</span>
        <span className={styles.phoneTitle}>
          <span>{course.code}</span>
          <span aria-hidden="true"> · {course.title}</span>
        </span>
      </div>

      <div className={styles.body}>
        <h3 id={titleId} className={styles.title}>
          {course.title}
        </h3>
        <p className={styles.why}>{item.explanation}</p>
        {difficulty !== null || hours ? (
          <div className={styles.stats}>
            {difficulty !== null ? (
              <span className={styles.meter}>
                <CapsMeter value={difficulty} size={16} animate />
                <span className={styles.meterValue} aria-hidden="true">
                  {formatAverage(difficulty)}
                </span>
              </span>
            ) : (
              <span />
            )}
            {hours ? (
              <span className={styles.hours} title="Hours per week students reported">
                <ClockIcon size={15} />
                <span aria-hidden="true">
                  {hoursShort(hours)}h<span className={styles.unit}>/wk</span>
                </span>
                <span className="wtc-sr">Most students reported {weeklyHoursLabel(hours)} a week</span>
              </span>
            ) : null}
          </div>
        ) : null}
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

      <div className={styles.actions}>
        <ButtonLink variant="dark" className={styles.view} to={paths.course(course.id)}>
          View course
        </ButtonLink>
      </div>
    </article>
  )
}
