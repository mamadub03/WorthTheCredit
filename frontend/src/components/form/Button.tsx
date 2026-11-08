import type { ButtonHTMLAttributes } from 'react'
import { buttonClassName, type ButtonSize, type ButtonVariant } from './buttonClassName.ts'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary: the page's main action (RIT orange). dark: ink fill. secondary: white fill. quiet: link style, no fill. */
  variant?: ButtonVariant
  /** normal: 48 px. small: 40 px pill. large: 54 px, for full-width actions such as sign in. */
  size?: ButtonSize
  /** Disables the button and tells assistive tech work is in progress. */
  busy?: boolean
}

/**
 * FE2's button on Grace's global wtc-btn classes (src/index.css), so it matches
 * FE1's buttons in the College carousel style. For an action that navigates,
 * use ButtonLink. Owner: FE2 (#26).
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
  return (
    <button
      type={type}
      className={buttonClassName(variant, size, className)}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {children}
    </button>
  )
}
