import { DestroyRef, inject, signal, type WritableSignal } from '@angular/core'

export interface StorageSignalOptions<T> {
  /** Where to save the value. Default: `'local'`. */
  storage?: 'local' | 'session' | Storage
  /** Update the value when another tab changes it. Default: `true`. */
  sync?: boolean
  /** Turns the value into a string. Default: `JSON.stringify`. */
  serialize?: (value: T) => string
  /** Turns the saved string back into a value. Default: `JSON.parse`. */
  deserialize?: (text: string) => T
}

export interface StorageSignal<T> extends WritableSignal<T> {
  /** Removes the saved value and sets the signal back to the initial value. */
  remove(): void
}

function getStorage(
  storage: StorageSignalOptions<unknown>['storage']
): Storage | undefined {
  if (storage && typeof storage === 'object') return storage
  try {
    // Throws when storage is blocked, and is missing on the server.
    if (typeof window === 'undefined') return undefined
    return storage === 'session' ? window.sessionStorage : window.localStorage
  } catch {
    return undefined
  }
}

function getDestroyRef(): DestroyRef | undefined {
  try {
    return inject(DestroyRef)
  } catch {
    // Not in an injection context.
    return undefined
  }
}

/**
 * Creates a signal whose value is saved to `localStorage` (or
 * `sessionStorage`) under `key`. On the server, or when storage is not
 * available, it works like a normal signal.
 */
export function storageSignal<T>(
  key: string,
  initialValue: T,
  options: StorageSignalOptions<T> = {}
): StorageSignal<T> {
  const {
    sync = true,
    serialize = JSON.stringify,
    deserialize = JSON.parse
  } = options
  const storage = getStorage(options.storage)

  const read = (text: string | null): T => {
    if (text === null) return initialValue
    try {
      return deserialize(text)
    } catch {
      return initialValue
    }
  }

  const write = (value: T) => {
    try {
      storage?.setItem(key, serialize(value))
    } catch {
      // Storage is full or blocked. Keep the value in memory only.
    }
  }

  let saved: string | null = null
  try {
    saved = storage?.getItem(key) ?? null
  } catch {
    // Storage is blocked.
  }

  const state = signal<T>(read(saved)) as StorageSignal<T>
  const set = state.set

  state.set = (value: T) => {
    set(value)
    write(value)
  }
  state.update = (fn: (value: T) => T) => state.set(fn(state()))
  state.remove = () => {
    set(initialValue)
    try {
      storage?.removeItem(key)
    } catch {
      // Storage is blocked.
    }
  }

  if (sync && storage && typeof window !== 'undefined') {
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea !== storage) return
      // key is null when another tab calls storage.clear().
      if (event.key === key || event.key === null) set(read(event.newValue))
    }
    window.addEventListener('storage', onStorage)
    getDestroyRef()?.onDestroy(() =>
      window.removeEventListener('storage', onStorage)
    )
  }

  return state
}
