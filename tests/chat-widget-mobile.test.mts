import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('mobile AQ Buddy stays compact until the user opens it', async () => {
  const [component, styles] = await Promise.all([
    readFile(new URL('../app/chat-widget.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/globals.css', import.meta.url), 'utf8'),
  ])

  assert.match(component, /className="aqb-mobile-launcher"/)
  assert.match(component, /!open && !fullScreen/)
  assert.match(styles, /\.aqb-mobile-launcher \{ display: none; \}/)
  assert.match(styles, /@media \(max-width: 600px\)[\s\S]*?\.aqb-mobile-launcher \{[\s\S]*?display: grid;/)
  assert.match(styles, /\.aqb-wrap:not\(\.aqb-wrap--fullscreen\) \.aqb-mascot,[\s\S]*?\.aqb-bubble \{ display: none; \}/)
})
