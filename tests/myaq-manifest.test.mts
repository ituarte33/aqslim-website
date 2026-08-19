import assert from 'node:assert/strict'
import test from 'node:test'
import manifest from '../app/manifest.ts'

test('My AQSLIM installs with the approved name and AQ Buddy icon assets', () => {
  const value = manifest()
  assert.equal(value.name, 'My AQSLIM')
  assert.equal(value.short_name, 'My AQSLIM')
  assert.equal(value.start_url, '/my-aqslim/welcome')
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
