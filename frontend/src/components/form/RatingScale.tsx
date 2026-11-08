import { useState, type CSSProperties, type ReactNode } from 'react'
import { ClockIcon } from '../ui/icons.tsx'
import { CAP_PATHS } from '../ui/format.ts'
import { FieldError } from './Field.tsx'
import styles from './form.module.css'

export interface ScaleOption<T extends string | number> {
  value: T
  label: string
  caption?: string
  /** A short visible unit after the label ('clock' only), such as "h"; the caption stays in the accessible name. */
  unit?: string
}

/**
 * How the options are drawn. Without an icon each option is a tile with its
 * number and caption (the Worth Score). 'caps' draws a row of graduation caps
 * that light up to the picked one, with a "{n} / 5" readout (concept
 * difficulty). 'clock' draws chips led by a clock, label then caption
 * (weekly hours).
 */
export type RatingScaleIcon = 'caps' | 'clock'

interface RatingScaleProps<T extends string | number> {
  id: string
  legend: string
  hint?: ReactNode
  options: readonly ScaleOption<T>[]
  value: T | null
  onChange: (value: T) => void
  error?: string
  icon?: RatingScaleIcon
  /** Keep the legend as the group's accessible name but hide it, when the screen draws its own visible title. */
  legendHidden?: boolean
  /** Another element's id whose text joins the legend in the group's name, so a visible title is part of it. */
  labelledBy?: string
  /** 'caps' only: the value a hovered or focused cap previews, or null when the preview ends. */
  onPreview?: (value: T | null) => void
}

/**
 * One choice from a short row of options, as a native radio group (arrow keys
 * move between options). Used for the 1-to-5 ratings and the weekly hours.
 * Every radio's accessible name starts with its label (the number or range),
 * then its caption, whatever the icon. Owner: FE2 (#27).
 */
export default function RatingScale<T extends string | number>({
  id,
  legend,
  hint,
  options,
  value,
  onChange,
  error,
  icon,
  legendHidden = false,
  labelledBy,
  onPreview,
}: RatingScaleProps<T>) {
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined
  return (
    <fieldset
      id={id}
      className={styles.fieldset}
      aria-labelledby={labelledBy ? `${id}-legend ${labelledBy}` : undefined}
      aria-describedby={describedBy}
    >
      <legend id={`${id}-legend`} className={legendHidden ? 'wtc-sr' : styles.legend}>
        {legend}
      </legend>
      {hint ? (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {icon === 'caps' ? (
        <CapScale id={id} options={options} value={value} onChange={onChange} onPreview={onPreview} />
      ) : icon === 'clock' ? (
        <ClockScale id={id} options={options} value={value} onChange={onChange} />
      ) : (
        <TileScale id={id} options={options} value={value} onChange={onChange} />
      )}
      <FieldError id={id} error={error} />
    </fieldset>
  )
}

interface ScaleBodyProps<T extends string | number> {
  id: string
  options: readonly ScaleOption<T>[]
  value: T | null
  onChange: (value: T) => void
}

function Radio<T extends string | number>({
  id,
  option,
  value,
  onChange,
  onFocus,
  onBlur,
}: Omit<ScaleBodyProps<T>, 'options'> & { option: ScaleOption<T>; onFocus?: () => void; onBlur?: () => void }) {
  return (
    <input
      id={`${id}-${option.value}`}
      className={styles.scaleInput}
      type="radio"
      name={id}
      checked={value === option.value}
      onChange={() => onChange(option.value)}
      onFocus={onFocus}
      onBlur={onBlur}
    />
  )
}

/** Number tiles. On a phone the caption is hidden and shown once, under the row, for the picked tile. */
function TileScale<T extends string | number>({ id, options, value, onChange }: ScaleBodyProps<T>) {
  const picked = options.find((option) => option.value === value)
  // The phone words row only helps when the ends say different things ("Not at all" to "Completely").
  const first = options[0]?.caption
  const last = options[options.length - 1]?.caption
  const showWords = Boolean(first && last && first !== last)
  return (
    <>
      <div className={styles.scale} style={{ '--count': options.length } as CSSProperties}>
        {options.map((option) => (
          <div key={String(option.value)} className={styles.scaleOption}>
            <Radio id={id} option={option} value={value} onChange={onChange} />
            <label htmlFor={`${id}-${option.value}`} className={styles.scaleLabel}>
              <span className={styles.scaleValue}>{option.label}</span>
              {option.caption ? <span className={styles.scaleCaption}>{option.caption}</span> : null}
            </label>
          </div>
        ))}
      </div>
      {showWords ? (
        <p className={styles.scaleWords} aria-hidden="true">
          <span>{first}</span>
          <span className={styles.scaleWordsPicked}>{picked?.caption ?? ''}</span>
          <span>{last}</span>
        </p>
      ) : null}
    </>
  )
}

/**
 * Graduation caps, lit up to the picked option. Hovering or focusing a cap
 * previews its value (caps and readout); leaving the row or blurring brings
 * back the picked value.
 */
function CapScale<T extends string | number>({
  id,
  options,
  value,
  onChange,
  onPreview,
}: ScaleBodyProps<T> & { onPreview?: (value: T | null) => void }) {
  const [preview, setPreviewIndex] = useState<number | null>(null)
  function setPreview(index: number | null) {
    setPreviewIndex(index)
    onPreview?.(index === null ? null : options[index].value)
  }
  const pickedIndex = options.findIndex((option) => option.value === value)
  const shownIndex = preview ?? pickedIndex
  const shown = shownIndex >= 0 ? options[shownIndex] : undefined
  return (
    <div className={styles.capRow}>
      <div className={styles.caps} onMouseLeave={() => setPreview(null)}>
        {options.map((option, index) => {
          const lit = shownIndex >= 0 && index <= shownIndex
          return (
            <div key={String(option.value)} className={styles.capOption} onMouseEnter={() => setPreview(index)}>
              <Radio
                id={id}
                option={option}
                value={value}
                onChange={onChange}
                onFocus={() => setPreview(index)}
                onBlur={() => setPreview(null)}
              />
              <label htmlFor={`${id}-${option.value}`} className={`${styles.cap} ${lit ? styles.capLit : ''}`}>
                <svg
                  className={styles.capIcon}
                  width="52"
                  height="52"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d={CAP_PATHS[0]} />
                  <path d={CAP_PATHS[1]} />
                  <path d={CAP_PATHS[2]} fill="none" />
                </svg>
                <span className="wtc-sr">
                  {option.label}
                  {option.caption ? ` ${option.caption}` : ''}
                </span>
              </label>
            </div>
          )
        })}
      </div>
      <p className={styles.capReadout} aria-hidden="true">
        <span className={styles.capReadoutValue}>
          {shown ? shown.label : '0'} / {options.length}
        </span>
        <span className={styles.capReadoutWord}>{shown?.caption ?? `Pick 1 to ${options.length} caps`}</span>
      </p>
    </div>
  )
}

/** Chips led by a clock, the range then its unit; form.module.css fills the face butter, white once picked. */
function ClockScale<T extends string | number>({ id, options, value, onChange }: ScaleBodyProps<T>) {
  return (
    // Phone grid: two across for up to four buckets (the board's three across leaves one alone), three for more.
    <div className={styles.clocks} style={{ '--cols': options.length <= 4 ? 2 : 3 } as CSSProperties}>
      {options.map((option) => (
        <div key={String(option.value)} className={styles.clockOption}>
          <Radio id={id} option={option} value={value} onChange={onChange} />
          <label htmlFor={`${id}-${option.value}`} className={styles.clock}>
            <ClockIcon className={styles.clockIcon} size={20} />
            {/* Seen: "6–10h". Heard: "6-10 hours", so the name still starts with the key. */}
            <span aria-hidden="true">
              {option.label.replace('-', '–')}
              {option.unit ? <span className={styles.clockCaption}>{option.unit}</span> : null}
            </span>
            <span className="wtc-sr">
              {option.label}
              {option.caption ? ` ${option.caption}` : ''}
            </span>
          </label>
        </div>
      ))}
    </div>
  )
}
