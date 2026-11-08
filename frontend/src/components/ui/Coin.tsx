import type { CSSProperties } from 'react'
import markUrl from '../../assets/brand/mark.svg'
import sealUrl from '../../assets/brand/seal.svg'
import styles from './Coin.module.css'

/**
 * The worth the cRedIT seal as a coin that gets tossed and flips every few
 * seconds: the seal on the front, the cR mark on the back. Decorative.
 * Stays still for people who turn on reduced motion. Owner: FE1 (#19).
 */
export default function Coin({ size = 120 }: { size?: number }) {
  return (
    <span className={styles.coin} style={{ '--coin': `${size}px` } as CSSProperties} aria-hidden="true">
      <span className={styles.spin}>
        <img className={styles.front} src={sealUrl} alt="" draggable={false} />
        <span className={styles.back}>
          <span className={styles.ring} />
          <img src={markUrl} alt="" draggable={false} />
        </span>
      </span>
      <span className={styles.shadow} />
    </span>
  )
}
