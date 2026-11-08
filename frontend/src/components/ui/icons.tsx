/** Small line icons used across FE1's pages. All decorative (aria-hidden). Owner: FE1 (#19). */
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 20, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <Svg strokeWidth={2.2} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </Svg>
  )
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Svg strokeWidth={2.4} {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  )
}

export function ChevronIcon({ direction = 'right', ...props }: IconProps & { direction?: 'left' | 'right' }) {
  return (
    <Svg strokeWidth={2.4} {...props}>
      <path d={direction === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
    </Svg>
  )
}

export function ClockIcon({ face, ...props }: IconProps & { face?: string }) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" fill={face ?? 'none'} />
      <path d="M12 7v5l3 2" />
    </Svg>
  )
}

export function SparkIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z" />
    </Svg>
  )
}

export function HomeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 11l8-7 8 7v9H4z" />
    </Svg>
  )
}

export function PencilIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" />
    </Svg>
  )
}

export function RetryIcon(props: IconProps) {
  return (
    <Svg strokeWidth={2.4} {...props}>
      <path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" />
    </Svg>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg strokeWidth={3} {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  )
}
