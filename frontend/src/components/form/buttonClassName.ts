import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'dark' | 'secondary' | 'quiet'
export type ButtonSize = 'normal' | 'small' | 'large'

/**
 * Grace's global button classes (src/index.css) for each filled variant, so
 * FE2's buttons and FE1's look and move the same. Quiet is FE2's own link-style
 * button and never gets the fill circle.
 */
const FILL_CLASS: Record<Exclude<ButtonVariant, 'quiet'>, string> = {
  primary: 'wtc-btn-orange',
  dark: 'wtc-btn-dark',
  secondary: 'wtc-btn-white',
}

/** The classes behind Button and ButtonLink, so a link and a button look the same. Owner: FE2. */
export function buttonClassName(variant: ButtonVariant, size: ButtonSize, extra?: string): string {
  const classes =
    variant === 'quiet'
      ? [styles.quiet, size === 'small' ? styles.quietSmall : '']
      : [
          'wtc-btn',
          FILL_CLASS[variant],
          size === 'small' ? 'wtc-btn-small' : '',
          size === 'large' ? styles.large : '',
        ]
  return [...classes, extra ?? ''].filter(Boolean).join(' ')
}
