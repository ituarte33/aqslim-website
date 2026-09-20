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
      ['https://www.aqslim.com/icons/myaqslim-192.png', '192x192', 'any'],
      ['https://www.aqslim.com/icons/myaqslim-512.png', '512x512', 'any'],
      ['https://www.aqslim.com/icons/myaqslim-512.png', '512x512', 'maskable'],
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

test('Home Screen metadata uses publicly fetchable My AQSLIM mascot icons', async () => {
  const [layout, portalLayout, favicon, appleTouchIcon] = await Promise.all([
    readFile(new URL('../app/layout.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/my-aqslim/layout.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../public/favicon.ico', import.meta.url)),
    readFile(new URL('../public/apple-touch-icon.png', import.meta.url)),
  ])

  assert.match(layout, /url: 'https:\/\/www\.aqslim\.com\/icons\/myaqslim-192\.png'/)
  assert.match(layout, /url: 'https:\/\/www\.aqslim\.com\/icons\/myaqslim-apple-touch-icon\.png'/)
  assert.match(portalLayout, /title: 'My AQSLIM'/)
  assert.deepEqual([...favicon.subarray(0, 4)], [0, 0, 1, 0])
  assert.deepEqual([...appleTouchIcon.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
})
