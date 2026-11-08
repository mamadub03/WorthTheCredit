import { useState, type KeyboardEvent } from 'react'
import { FieldError } from './Field.tsx'
import styles from './form.module.css'

interface TagInputProps {
  id: string
  label: string
  hint?: string
  tags: readonly string[]
  /** Returns true when the text was accepted (or was empty), so the box clears. */
  onAdd: (text: string) => boolean
  onRemove: (tag: string) => void
  max: number
  error?: string
  optional?: boolean
  placeholder?: string
}

/**
 * Short free-text tags. Enter or a comma adds one, Backspace in an empty box
 * removes the last, and leaving the box adds what's typed. The parent decides
 * what's acceptable (trimming, duplicates, limits). Each tag is a tinted pill
 * (five tints by position) that pops in, with a round remove button whose hit
 * area reaches 44 px. Owner: FE2 (#27).
 */
export default function TagInput({ id, label, hint, tags, onAdd, onRemove, max, error, optional, placeholder }: TagInputProps) {
  const [draft, setDraft] = useState('')
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : '', `${id}-count`].filter(Boolean).join(' ')

  function commit(text: string) {
    if (onAdd(text)) setDraft('')
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      commit(draft)
    } else if (event.key === 'Backspace' && draft === '' && tags.length > 0) {
      onRemove(tags[tags.length - 1])
    }
  }

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {optional ? <span className={styles.optional}>optional</span> : null}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      <div className={`${styles.tagBox} ${error ? styles.invalid : ''}`}>
        {tags.map((tag) => (
          <span key={tag} className={styles.tag}>
            {tag}
            <button type="button" className={styles.tagRemove} aria-label={`Remove ${tag}`} onClick={() => onRemove(tag)}>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </span>
        ))}
        <input
          id={id}
          className={styles.tagInput}
          value={draft}
          placeholder={tags.length === 0 ? placeholder : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (draft.trim()) commit(draft)
          }}
        />
      </div>
      <FieldError id={id} error={error} />
      <p id={`${id}-count`} className={styles.counter}>
        {tags.length} of {max}
      </p>
    </div>
  )
}
