import type { ReactNode } from 'react'
import { FieldError } from './Field.tsx'
import styles from './form.module.css'

interface ChoiceGroupProps<T extends string> {
  id: string
  legend: string
  hint?: ReactNode
  options: readonly { key: T; label: string }[]
  selected: readonly T[]
  onToggle: (key: T) => void
  error?: string
  /** Keep the legend as the group's accessible name but hide it, when the screen draws its own visible title. */
  legendHidden?: boolean
}

/**
 * A multi-select checkbox group in a fieldset, for the review goals. Each
 * option is a pill chip: a label around a visually hidden native checkbox, so
 * Tab, Space and the checkbox role all work as before. A checked chip takes the
 * tint for its position (form.module.css cycles five) and an ink border. Owner: FE2 (#27).
 */
export default function ChoiceGroup<T extends string>({ id, legend, hint, options, selected, onToggle, error, legendHidden = false }: ChoiceGroupProps<T>) {
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined
  return (
    <fieldset id={id} className={styles.fieldset} aria-describedby={describedBy}>
      <legend className={legendHidden ? 'wtc-sr' : styles.legend}>{legend}</legend>
      {hint ? (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      <div className={styles.choices}>
        {options.map((option) => {
          const checked = selected.includes(option.key)
          return (
            <label
              key={option.key}
              className={`${styles.choice} ${checked ? styles.choiceOn : ''}`}
            >
              <input
                type="checkbox"
                className={styles.choiceInput}
                checked={checked}
                onChange={() => onToggle(option.key)}
              />
              <span className={styles.choiceDot} aria-hidden="true">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  focusable="false"
                >
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </span>
              {option.label}
            </label>
          )
        })}
      </div>
      <FieldError id={id} error={error} />
    </fieldset>
  )
}
