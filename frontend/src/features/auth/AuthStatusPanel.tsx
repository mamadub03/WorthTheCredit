import type { ComponentProps } from 'react'
import StatusPanel from '../../components/form/StatusPanel.tsx'
import Coin from '../../components/ui/Coin.tsx'
import styles from './AuthStatusPanel.module.css'

type AuthStatusPanelProps = Omit<ComponentProps<typeof StatusPanel>, 'art'> & {
  /** Heads the card with Grace's tossing coin, as on the sign-in card (decorative). */
  coin?: boolean
}

/**
 * FE2's StatusPanel for the sign-in states (/signin while it loads, /callback,
 * RequireAuth and the verify-email step), in a centered column the width of
 * the sign-in card rather than across the whole page. The coin goes in the
 * panel's art slot, so it rises with the card. Owner: FE2 (#26).
 */
export default function AuthStatusPanel({ coin = false, ...panel }: AuthStatusPanelProps) {
  return (
    <div className={styles.frame}>
      <StatusPanel {...panel} art={coin ? <Coin size={88} /> : undefined} />
    </div>
  )
}
