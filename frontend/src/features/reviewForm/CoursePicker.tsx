import { useState, type KeyboardEvent } from 'react'
import type { CourseSummary } from '../../api/courses.ts'
import Button from '../../components/form/Button.tsx'
import { FieldError } from '../../components/form/Field.tsx'
import formStyles from '../../components/form/form.module.css'
import styles from './CoursePicker.module.css'
import { useCourseSearch, type LoadStatus } from './useCourses.ts'

interface CoursePickerProps {
  /** Used for focusing this question when it needs an answer. */
  id: string
  courseId: string | null
  /** The chosen course once it's known (useChosenCourse on the page). */
  course: CourseSummary | null
  status: LoadStatus
  onChange: (course: CourseSummary | null) => void
  error?: string
}

/**
 * Picks the course being reviewed: a search box over GET /courses, or the
 * chosen course on a cream card with a way to change it. The page looks the
 * course up (useChosenCourse) so its header can name it too. Owner: FE2 (#27).
 */
export default function CoursePicker({ id, courseId, course, status, onChange, error }: CoursePickerProps) {
  if (courseId) {
    return (
      <div id={id} className={`${formStyles.field} ${styles.picker}`}>
        <span className={formStyles.label}>Course</span>
        <div className={styles.selected}>
          <div className={styles.selectedText} aria-live="polite">
            {course ? (
              <>
                <strong className={styles.selectedCode}>{course.code}</strong>
                <span className={styles.selectedTitle}>{course.title}</span>
              </>
            ) : status === 'error' ? (
              <span className={styles.selectedTitle}>We couldn't find that course. Pick it again.</span>
            ) : (
              <span className={styles.selectedTitle}>Loading the course…</span>
            )}
          </div>
          <Button variant="secondary" className={styles.change} onClick={() => onChange(null)}>
            Change
          </Button>
        </div>
        <FieldError id={id} error={error} />
      </div>
    )
  }

  return <CourseSearch id={id} error={error} onPick={onChange} />
}

function CourseSearch({ id, error, onPick }: { id: string; error?: string; onPick: (course: CourseSummary) => void }) {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const search = useCourseSearch(text)
  const results = search.results
  const inputId = `${id}-search`
  const listId = `${id}-options`
  const showList = open && results.length > 0

  function pick(course: CourseSummary) {
    onPick(course)
    setText('')
    setOpen(false)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActive((index) => Math.min(index + 1, Math.max(results.length - 1, 0)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter' && showList && results[active]) {
      event.preventDefault()
      pick(results[active])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  let note: string | null = null
  if (text.trim().length >= 2) {
    if (search.status === 'loading' && results.length === 0) note = 'Searching…'
    else if (search.status === 'error') note = "Couldn't load courses. Check your connection and try again."
    else if (search.status === 'done' && results.length === 0) note = `No courses match "${text.trim()}".`
  }

  return (
    <div id={id} className={`${formStyles.field} ${styles.picker}`}>
      <label className={formStyles.label} htmlFor={inputId}>
        Course
      </label>
      <p id={`${id}-hint`} className={formStyles.hint}>
        Search by code or name, like SWEN-261 or software engineering.
      </p>
      <div className={styles.combo}>
        <input
          id={inputId}
          className={`${formStyles.input} ${error ? formStyles.invalid : ''}`}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && results[active] ? `${listId}-${results[active].id}` : undefined}
          aria-describedby={[error ? `${id}-error` : '', `${id}-hint`].filter(Boolean).join(' ')}
          aria-invalid={error ? true : undefined}
          autoComplete="off"
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setOpen(true)
            setActive(0)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        <ul id={listId} role="listbox" aria-label="Matching courses" className={styles.options} hidden={!showList}>
          {results.map((course, index) => (
            <li
              key={course.id}
              id={`${listId}-${course.id}`}
              role="option"
              aria-selected={index === active}
              className={`${styles.option} ${index === active ? styles.active : ''}`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => pick(course)}
            >
              <strong className={styles.optionCode}>{course.code}</strong>
              <span className={styles.optionTitle}>{course.title}</span>
            </li>
          ))}
        </ul>
      </div>
      <FieldError id={id} error={error} />
      {note ? (
        <p className={formStyles.hint} aria-live="polite">
          {note}
        </p>
      ) : null}
    </div>
  )
}
