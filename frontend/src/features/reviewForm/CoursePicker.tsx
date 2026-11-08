import { useState, type KeyboardEvent } from 'react'
import type { CourseSummary } from '../../api/courses.ts'
import Button from '../../components/form/Button.tsx'
import formStyles from '../../components/form/form.module.css'
import styles from './CoursePicker.module.css'
import { useCourse, useCourseSearch } from './useCourses.ts'

interface CoursePickerProps {
  /** Used for focusing this question when it needs an answer. */
  id: string
  courseId: string | null
  onChange: (course: CourseSummary | null) => void
  error?: string
}

/**
 * Picks the course being reviewed: a search box over GET /courses, or the
 * chosen course with a way to change it. Owner: FE2 (#27).
 */
export default function CoursePicker({ id, courseId, onChange, error }: CoursePickerProps) {
  const [chosen, setChosen] = useState<CourseSummary | null>(null)
  const needsLookup = courseId !== null && chosen?.id !== courseId
  const lookup = useCourse(needsLookup ? courseId : null)
  const course = chosen?.id === courseId ? chosen : lookup.course

  if (courseId) {
    return (
      <div id={id} className={formStyles.field}>
        <span className={formStyles.label}>Course</span>
        <div className={styles.selected}>
          <div className={styles.selectedText} aria-live="polite">
            {course ? (
              <>
                <strong>{course.code}</strong>
                <span>{course.title}</span>
              </>
            ) : lookup.status === 'error' ? (
              <span>We couldn't find that course. Pick it again.</span>
            ) : (
              <span>Loading the course…</span>
            )}
          </div>
          <Button
            variant="secondary"
            size="small"
            onClick={() => {
              setChosen(null)
              onChange(null)
            }}
          >
            Change
          </Button>
        </div>
        {error ? <p className={formStyles.error}>{error}</p> : null}
      </div>
    )
  }

  return (
    <CourseSearch
      id={id}
      error={error}
      onPick={(picked) => {
        setChosen(picked)
        onChange(picked)
      }}
    />
  )
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
    <div id={id} className={formStyles.field}>
      <label className={formStyles.label} htmlFor={inputId}>
        Course
      </label>
      {error ? (
        <p id={`${id}-error`} className={formStyles.error}>
          {error}
        </p>
      ) : null}
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
              <strong>{course.code}</strong>
              <span>{course.title}</span>
            </li>
          ))}
        </ul>
      </div>
      {note ? (
        <p className={formStyles.hint} aria-live="polite">
          {note}
        </p>
      ) : null}
    </div>
  )
}
