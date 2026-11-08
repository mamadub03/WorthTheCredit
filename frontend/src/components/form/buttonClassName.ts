import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'dark' | 'secondary' | 'quiet'
export type ButtonSize = 'normal' | 'small'

/** The classes behind Button and ButtonLink, so a link and a button look the same. Owner: FE2. */
export function buttonClassName(variant: ButtonVariant, size: ButtonSize, extra?: string): string {
  return [styles.button, styles[variant], size === 'small' ? styles.small : '', extra ?? ''].filter(Boolean).join(' ')
}
