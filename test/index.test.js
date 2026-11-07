import assert from 'node:assert/strict'
import { test } from 'node:test'
import { storageSignal } from '../dist/index.js'

class MemoryStorage {
  items = new Map()
  getItem(key) {
    return this.items.has(key) ? this.items.get(key) : null
  }
  setItem(key, value) {
    this.items.set(key, String(value))
  }
  removeItem(key) {
    this.items.delete(key)
  }
}

test('uses the initial value when nothing is saved', () => {
  const storage = new MemoryStorage()
  const theme = storageSignal('theme', 'light', { storage })
  assert.equal(theme(), 'light')
  assert.equal(storage.getItem('theme'), null)
})

test('reads the saved value', () => {
  const storage = new MemoryStorage()
  storage.setItem('count', '5')
  const count = storageSignal('count', 0, { storage })
  assert.equal(count(), 5)
})

test('set and update save the value', () => {
  const storage = new MemoryStorage()
  const user = storageSignal('user', { name: 'a' }, { storage })
  user.set({ name: 'b' })
  assert.equal(storage.getItem('user'), '{"name":"b"}')
  user.update((u) => ({ ...u, age: 2 }))
  assert.deepEqual(user(), { name: 'b', age: 2 })
  assert.equal(storage.getItem('user'), '{"name":"b","age":2}')
})

test('remove clears the saved value', () => {
  const storage = new MemoryStorage()
  const count = storageSignal('count', 0, { storage })
  count.set(3)
  count.remove()
  assert.equal(count(), 0)
  assert.equal(storage.getItem('count'), null)
})

test('falls back to the initial value when the saved value is broken', () => {
  const storage = new MemoryStorage()
  storage.setItem('count', '{oops')
  assert.equal(storageSignal('count', 1, { storage })(), 1)
})

test('custom serialize and deserialize', () => {
  const storage = new MemoryStorage()
  const date = storageSignal('date', new Date(0), {
    storage,
    serialize: (d) => d.toISOString(),
    deserialize: (s) => new Date(s)
  })
  date.set(new Date(1000))
  assert.equal(storage.getItem('date'), '1970-01-01T00:00:01.000Z')
  const again = storageSignal('date', new Date(0), {
    storage,
    serialize: (d) => d.toISOString(),
    deserialize: (s) => new Date(s)
  })
  assert.equal(again().getTime(), 1000)
})

test('works like a normal signal when storage is not available', () => {
  const count = storageSignal('count', 1)
  count.set(2)
  assert.equal(count(), 2)
  count.remove()
  assert.equal(count(), 1)
})

test('keeps working when storage throws', () => {
  const storage = {
    getItem() {
      throw new Error('blocked')
    },
    setItem() {
      throw new Error('full')
    },
    removeItem() {
      throw new Error('blocked')
    }
  }
  const count = storageSignal('count', 1, { storage })
  count.set(2)
  assert.equal(count(), 2)
  count.remove()
  assert.equal(count(), 1)
})

test('updates when another tab changes the value', (t) => {
  globalThis.window = new globalThis.EventTarget()
  t.after(() => delete globalThis.window)

  const storage = new MemoryStorage()
  const count = storageSignal('count', 0, { storage })
  const noSync = storageSignal('count', 0, { storage, sync: false })

  const send = (props) =>
    globalThis.window.dispatchEvent(
      Object.assign(new globalThis.Event('storage'), props)
    )

  send({ key: 'count', newValue: '7', storageArea: storage })
  assert.equal(count(), 7)
  assert.equal(noSync(), 0)

  send({ key: 'other', newValue: '8', storageArea: storage })
  send({ key: 'count', newValue: '9', storageArea: new MemoryStorage() })
  assert.equal(count(), 7)

  send({ key: null, newValue: null, storageArea: storage })
  assert.equal(count(), 0)
})
