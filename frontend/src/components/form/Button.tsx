import type { ButtonHTMLAttributes } from 'react'
import styles from './Button.module.css'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'quiet'
  size?: 'normal' | 'small'
  /** Disables the button and tells assistive tech work is in progress. */
  busy?: boolean
}

/**
 * FE2's button, until FE1's shared Button lands (#19); then swap the import.
 * Owner: FE2 (#26).
 */
export default function Button({
  variant = 'primary',
  size = 'normal',
  busy = false,
  type = 'button',
  className,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const classes = [styles.button, styles[variant], size === 'small' ? styles.small : '', className ?? ''].filter(Boolean).join(' ')
  return (
    <button type={type} className={classes} disabled={disabled || busy} aria-busy={busy || undefined} {...rest}>
      {children}
    </button>
  )
}
