import styles from './form.module.css'

interface ChoiceGroupProps<T extends string> {
  id: string
  legend: string
  hint?: string
  options: readonly { key: T; label: string }[]
  selected: readonly T[]
  onToggle: (key: T) => void
  error?: string
}

/** A multi-select checkbox group in a fieldset, for the review goals. Owner: FE2 (#27). */
export default function ChoiceGroup<T extends string>({ id, legend, hint, options, selected, onToggle, error }: ChoiceGroupProps<T>) {
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
      <div className={styles.choices}>
        {options.map((option) => (
          <label key={option.key} className={styles.choice}>
            <input type="checkbox" checked={selected.includes(option.key)} onChange={() => onToggle(option.key)} />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
