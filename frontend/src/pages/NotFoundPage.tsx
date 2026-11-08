import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <section className="panel">
      <h1>Page not found</h1>
      <p>That route is not part of WorthTheCredit yet.</p>
      <p>
        <Link to="/">Back to home</Link>
      </p>
    </section>
  )
}
