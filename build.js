import { execSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { build } from 'esbuild'

rmSync('dist', { recursive: true, force: true })

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'neutral',
  target: 'es2022',
  format: 'esm',
  external: ['@angular/core'],
  outfile: 'dist/index.js'
})

// esbuild doesn't emit type declarations, so tsc handles those.
execSync('tsc', { stdio: 'inherit' })
