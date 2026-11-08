import { useId, useState, type FormEvent } from 'react'
import { SearchIcon } from './icons.tsx'
import styles from './SearchBar.module.css'

interface SearchBarProps {
  initialValue?: string
  onSearch: (query: string) => void
}

/**
 * The design's search box: white pill, search icon, orange "Search" button.
 * Matches course codes, titles and descriptions. Owner: FE1 (#20).
 */
export default function SearchBar({ initialValue = '', onSearch }: SearchBarProps) {
  const [value, setValue] = useState(initialValue)
  const id = useId()
  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSearch(value.trim())
  }
  return (
    <form role="search" className={styles.bar} onSubmit={submit}>
      <SearchIcon size={20} className={styles.icon} />
      <label htmlFor={id} className="wtc-sr">
        Search courses
      </label>
      <input
        id={id}
        className={styles.input}
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search a course code, name or topic"
        autoComplete="off"
        enterKeyHint="search"
      />
      <button type="submit" className={`wtc-btn wtc-btn-orange ${styles.button}`}>
        Search
      </button>
    </form>
  )
}

interface DepartmentSelectProps {
  departments: readonly string[]
  value: string
  onChange: (department: string) => void
}

/** The design's "Department" dropdown under the search bar. "" means all departments. */
export function DepartmentSelect({ departments, value, onChange }: DepartmentSelectProps) {
  const id = useId()
  return (
    <label className={styles.filter} htmlFor={id}>
      Department
      <select id={id} className={styles.select} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">All departments</option>
        {departments.map((department) => (
          <option key={department} value={department}>
            {department}
          </option>
        ))}
      </select>
    </label>
  )
}
