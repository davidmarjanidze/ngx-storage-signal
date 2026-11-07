# ngx-storage-signal

[![npm version](https://img.shields.io/npm/v/ngx-storage-signal.svg)](https://www.npmjs.com/package/ngx-storage-signal)
[![license](https://img.shields.io/npm/l/ngx-storage-signal.svg)](https://www.npmjs.com/package/ngx-storage-signal)

An Angular signal that saves its value to `localStorage` or `sessionStorage`.
The value is still there after a page reload, and it updates when another tab
changes it. Useful for settings like the theme, language or a closed banner.

Works with server-side rendering. No dependencies.

## Installation

```console
npm i ngx-storage-signal
```

Requires Angular 17 or newer.

## Usage

```typescript
import { Component } from '@angular/core'
import { storageSignal } from 'ngx-storage-signal'

@Component({
  selector: 'app-example',
  template: `
    <button (click)="theme.set(theme() === 'light' ? 'dark' : 'light')">
      Theme: {{ theme() }}
    </button>
  `
})
export class Example {
  theme = storageSignal('theme', 'light')
}
```

`storageSignal` returns a normal writable signal, so you can use it in
templates, `computed`, `effect` and `[(ngModel)]` like any other signal. Every
`set` and `update` saves the new value.

### Use sessionStorage

```ts
const step = storageSignal('checkout-step', 1, { storage: 'session' })
```

### Remove the saved value

```ts
const banner = storageSignal('banner-closed', false)

banner.remove() // removes the saved value and sets the signal back to false
```

### Save values that JSON can't handle

```ts
const lastVisit = storageSignal('last-visit', new Date(), {
  serialize: (date) => date.toISOString(),
  deserialize: (text) => new Date(text)
})
```

## How it works

The saved value is read once, when the signal is created. If nothing is saved
yet, or the saved value can't be read, the signal starts with the initial
value.

When another tab changes the same key, the browser sends a `storage` event and
the signal gets the new value. When the signal is created inside a component
or service, the event listener is removed when it is destroyed.

On the server, or when storage is blocked or full, the signal works like a
normal signal and keeps the value in memory only.

## API

### storageSignal(key, initialValue, options)

- `key` - the storage key.
- `initialValue` - value to use when nothing is saved.
- `options` - optional:
  - `storage` - `'local'`, `'session'` or any object with the `Storage`
    methods. Default: `'local'`.
  - `sync` - update the value when another tab changes it. Default: `true`.
  - `serialize` - turns the value into a string. Default: `JSON.stringify`.
  - `deserialize` - turns the saved string back into a value. Default:
    `JSON.parse`.
- Returns: a writable signal with one more method:
  - `remove()` - removes the saved value and sets the signal back to
    `initialValue`.

## License

ISC
