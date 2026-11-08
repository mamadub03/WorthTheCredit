import type { ButtonHTMLAttributes } from 'react'
import { buttonClassName, type ButtonSize, type ButtonVariant } from './buttonClassName.ts'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary: the page's main action (RIT orange). dark: the header's sign-in pill. secondary: outlined. quiet: link style. */
  variant?: ButtonVariant
  size?: ButtonSize
  /** Disables the button and tells assistive tech work is in progress. */
  busy?: boolean
}

/**
 * FE2's button in the Example B style, until FE1's shared Button lands (#19);
 * then swap the import. For an action that navigates, use ButtonLink.
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
