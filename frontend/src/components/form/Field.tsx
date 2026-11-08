import type { ReactNode } from 'react'
import styles from './form.module.css'

/**
 * Labeled text, textarea, and select fields with a hint and an error, wired up
 * with aria-describedby so screen readers read both. Styled to the College
 * carousel boards: cream boxes with a warm 2 px border, the hint under the
 * label and the error under the control. Owner: FE2 (#27).
 */

interface BaseProps {
  id: string
  label: string
  hint?: ReactNode
  error?: string
  optional?: boolean
}

function describedBy(id: string, hint?: ReactNode, error?: string): string | undefined {
  const ids = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean)
  return ids.length > 0 ? ids.join(' ') : undefined
}

function Label({ id, label, optional }: Pick<BaseProps, 'id' | 'label' | 'optional'>) {
  return (
    <label className={styles.label} htmlFor={id}>
      {label}
      {optional ? <span className={styles.optional}>optional</span> : null}
    </label>
  )
}

function Hint({ id, hint }: Pick<BaseProps, 'id' | 'hint'>) {
  return hint ? (
    <p id={`${id}-hint`} className={styles.hint}>
      {hint}
    </p>
  ) : null
}

/** The field message under a control: danger text with a small alert icon. */
export function FieldError({ id, error }: { id: string; error?: string }) {
  return error ? (
    <p id={`${id}-error`} className={styles.error}>
      <svg
        className={styles.errorIcon}
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16.5v.01" />
      </svg>
      {error}
    </p>
  ) : null
}

export function TextField({
  id,
  label,
  hint,
  error,
  optional,
  value,
  onChange,
  maxLength,
  placeholder,
}: BaseProps & { value: string; onChange: (value: string) => void; maxLength?: number; placeholder?: string }) {
  return (
    <div className={styles.field}>
      <Label id={id} label={label} optional={optional} />
      <Hint id={id} hint={hint} />
      <input
        id={id}
        className={`${styles.input} ${error ? styles.invalid : ''}`}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldError id={id} error={error} />
    </div>
  )
}

export function TextAreaField({
  id,
  label,
  hint,
  error,
  optional,
  value,
  onChange,
  maxLength,
  placeholder,
}: BaseProps & { value: string; onChange: (value: string) => void; maxLength: number; placeholder?: string }) {
  return (
    <div className={styles.field}>
      <Label id={id} label={label} optional={optional} />
      <Hint id={id} hint={hint} />
      <textarea
        id={id}
        className={`${styles.textarea} ${error ? styles.invalid : ''}`}
        value={value}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldError id={id} error={error} />
      <p className={styles.counter} aria-live="polite">
        {value.trim().length.toLocaleString('en-US')} / {maxLength.toLocaleString('en-US')}
      </p>
    </div>
  )
}

export function SelectField({
  id,
  label,
  hint,
  error,
  optional,
  value,
  onChange,
  options,
  placeholder,
}: BaseProps & {
  value: string
  onChange: (value: string) => void
  options: readonly { value: string; label: string }[]
  placeholder: string
}) {
  return (
    <div className={styles.field}>
      <Label id={id} label={label} optional={optional} />
      <Hint id={id} hint={hint} />
      <select
        id={id}
        className={`${styles.select} ${error ? styles.invalid : ''}`}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldError id={id} error={error} />
    </div>
  )
}
