/**
 * What FE2 keeps in the browser for the signed-in student: form drafts and the
 * last recommendations. Every per-student key sits under one prefix, so logout
 * can wipe them, which matters on shared lab computers. Owner: FE2 (#26).
 */

const USER_PREFIX = 'wtc:user:'
export const DEV_SESSION_KEY = 'wtc:dev-auth'

type StorageKind = 'session' | 'local'

export function userKey(sub: string, name: string): string {
  return `${USER_PREFIX}${sub}:${name}`
}

export function readStored<T>(key: string, kind: StorageKind = 'session'): T | null {
  try {
    const raw = pick(kind)?.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeStored(key: string, value: unknown, kind: StorageKind = 'session'): void {
  try {
    pick(kind)?.setItem(key, JSON.stringify(value))
  } catch {
    // Private mode or a full quota: the app still works, it just won't remember.
  }
}

export function removeStored(key: string, kind: StorageKind = 'session'): void {
  try {
    pick(kind)?.removeItem(key)
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

/** Removes every per-student key and the dev session. The mock API's sample data stays. */
export function clearAppStorage(): void {
  for (const storage of [pick('session'), pick('local')]) {
    if (!storage) continue
    const doomed: string[] = []
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (key && (key.startsWith(USER_PREFIX) || key === DEV_SESSION_KEY)) doomed.push(key)
    }
    for (const key of doomed) storage.removeItem(key)
  }
}

function pick(kind: StorageKind): Storage | null {
  try {
    return kind === 'session' ? window.sessionStorage : window.localStorage
  } catch {
    return null
  }
}
