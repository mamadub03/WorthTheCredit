import { Link, type LinkProps } from 'react-router'
import { buttonClassName, type ButtonSize, type ButtonVariant } from './buttonClassName.ts'

export interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant
  size?: ButtonSize
}

/**
 * A router link that looks like Button, for actions that go somewhere, such
 * as the header's "Sign in". Keeping it a link keeps open-in-new-tab and the
 * right screen reader role. Owner: FE2.
 */
export default function ButtonLink({ variant = 'primary', size = 'normal', className, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClassName(variant, size, className)} {...rest} />
}
