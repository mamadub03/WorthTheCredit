/** Display helpers shared by FE1's components. Owner: FE1 (#19). */

/** The graduation cap the difficulty meter is made of (24×24 viewBox). */
export const CAP_PATHS = ['M2 9.5L12 5l10 4.5L12 14z', 'M6 11.5V16c0 1.2 2.7 2.5 6 2.5s6-1.3 6-2.5v-4.5', 'M21 10v5'] as const

/** "1 review", "18 reviews". */
export function reviewCountLabel(count: number): string {
  return count === 1 ? '1 review' : `${count} reviews`
}
