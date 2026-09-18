import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import * as manifestModule from '../app/manifest.ts'

const importedManifest = manifestModule.default as typeof manifestModule.default & {
  default?: typeof manifestModule.default
}
const manifest = typeof importedManifest === 'function'
  ? importedManifest
  : importedManifest.default!

test('My AQSLIM installs with Home as the canonical patient start route', () => {
  const value = manifest()
  assert.equal(value.name, 'My AQSLIM')
  assert.equal(value.short_name, 'My AQSLIM')
  assert.equal(value.start_url, '/my-aqslim')
  assert.notEqual(value.start_url, '/food-scanner')
  assert.notEqual(value.start_url, '/my-aqslim/pilot')
  assert.equal(value.background_color, '#161513')
  assert.equal(value.theme_color, '#161513')
  assert.deepEqual(
    value.icons?.map(icon => [icon.src, icon.sizes, icon.purpose]),
    [
      ['/icons/myaqslim-192.png', '192x192', 'any'],
      ['/icons/myaqslim-512.png', '512x512', 'any'],
      ['/icons/myaqslim-512.png', '512x512', 'maskable'],
    ],
  )
})

test('My AQSLIM welcome sends pilot and regular patient entry to Home', async () => {
  const source = await readFile(new URL('../app/my-aqslim/welcome/page.tsx', import.meta.url), 'utf8')
  assert.match(source, /destination="\/my-aqslim"/)
  assert.doesNotMatch(source, /destination="\/my-aqslim\/pilot"/)
  assert.doesNotMatch(source, /destination="\/food-scanner"/)
})

test('public patient authentication always lands on My AQSLIM Home', async () => {
  const [signIn, signUp] = await Promise.all([
    readFile(new URL('../app/sign-in/[[...sign-in]]/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/sign-up/[[...sign-up]]/page.tsx', import.meta.url), 'utf8'),
  ])
  for (const source of [signIn, signUp]) {
    assert.match(source, /forceRedirectUrl="\/my-aqslim"/)
    assert.doesNotMatch(source, /forceRedirectUrl="\/food-scanner"/)
  }
})
