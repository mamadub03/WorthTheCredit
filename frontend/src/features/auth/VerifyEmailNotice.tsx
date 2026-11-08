import Button from '../../components/form/Button.tsx'
import { useEmailVerification } from './useEmailVerification.ts'
import styles from './VerifyEmailNotice.module.css'

/** What an unverified student sees instead of the review form. Owner: FE2 (#26). */
export default function VerifyEmailNotice() {
  const verification = useEmailVerification()
  const checking = verification.checkStatus === 'checking'

  return (
    <section className="panel" aria-labelledby="verify-email-title">
      <p className="eyebrow">One more step</p>
      <h1 id="verify-email-title">Verify your email</h1>
      <p>
        We sent a verification link to <strong>{verification.email ?? 'your email address'}</strong> when you signed up. Click
        it, then come back here.
      </p>
      <p>Reviews need a verified email so every rating comes from a real student.</p>
      <div className={styles.actions}>
        <Button onClick={() => void verification.check()} busy={checking}>
          I've verified my email
        </Button>
      </div>
      <p className={styles.status} role="status">
        {verification.checkStatus === 'still_unverified' && 'Not verified yet. Check your inbox and spam folder, then try again.'}
        {verification.checkStatus === 'failed' && "We couldn't check right now. Try again in a moment."}
      </p>
    </section>
  )
}
