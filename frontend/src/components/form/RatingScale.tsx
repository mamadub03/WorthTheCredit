import type { CSSProperties } from 'react'
import styles from './form.module.css'

export interface ScaleOption<T extends string | number> {
  value: T
  label: string
  caption?: string
}

interface RatingScaleProps<T extends string | number> {
  id: string
  legend: string
  hint?: string
  options: readonly ScaleOption<T>[]
  value: T | null
  onChange: (value: T) => void
  error?: string
}

/**
 * One choice from a short row of options, as a native radio group (arrow keys
 * move between options). Used for the 1-to-5 ratings and the weekly hours.
 * Owner: FE2 (#27).
 */
export default function RatingScale<T extends string | number>({ id, legend, hint, options, value, onChange, error }: RatingScaleProps<T>) {
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined
  return (
    <fieldset id={id} className={styles.fieldset} aria-describedby={describedBy}>
      <legend className={styles.label}>{legend}</legend>
      {error ? (
        <p id={`${id}-error`} className={styles.error}>
          {error}
        </p>
      ) : null}
      {hint ? (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      <div className={styles.scale} style={{ '--count': options.length } as CSSProperties}>
        {options.map((option) => {
          const optionId = `${id}-${option.value}`
          return (
            <div key={String(option.value)} className={styles.scaleOption}>
              <input
                id={optionId}
                type="radio"
                name={id}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
              />
              <label htmlFor={optionId} className={styles.scaleLabel}>
                <span className={styles.scaleValue}>{option.label}</span>
                {option.caption ? <span className={styles.scaleCaption}>{option.caption}</span> : null}
              </label>
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}
