import { useId, useState, type FormEvent } from 'react'
import { SearchIcon } from './icons.tsx'
import styles from './SearchBar.module.css'

interface SearchBarProps {
  initialValue?: string
  onSearch: (query: string) => void
  /** Larger hero version on the home page. */
  size?: 'hero' | 'normal'
  autoFocus?: boolean
}

/**
 * Course search box: matches course codes, titles and descriptions.
 * Owner: FE1 (#20).
 */
export default function SearchBar({ initialValue = '', onSearch, size = 'normal', autoFocus }: SearchBarProps) {
  const [value, setValue] = useState(initialValue)
  const id = useId()
  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSearch(value.trim())
  }
  return (
    <form role="search" className={`${styles.bar} ${size === 'hero' ? styles.hero : ''}`} onSubmit={submit}>
      <label htmlFor={id} className="wtc-sr">
        Search courses
      </label>
      <SearchIcon size={size === 'hero' ? 22 : 20} className={styles.icon} />
      <input
        id={id}
        className={styles.input}
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Course code, title or topic"
        autoComplete="off"
        enterKeyHint="search"
        autoFocus={autoFocus}
      />
      <button type="submit" className={`wtc-btn wtc-btn-orange ${styles.button}`}>
        Search
      </button>
    </form>
  )
}
