import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('My AQSLIM keeps a long Clinic-published plan title inside its mobile card', async () => {
  const [view, styles] = await Promise.all([
    readFile(new URL('../app/my-aqslim/plan/plan-view.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/my-aqslim/portal.module.css', import.meta.url), 'utf8'),
  ])

  assert.match(view, /const plan = data\.planName \|\| data\.phase/)
  assert.match(styles, /\.planHero > div:last-child \{ min-width: 0; flex: 1; \}/)
  assert.match(styles, /\.planHero h2 \{ max-width: 100%; overflow-wrap: anywhere; line-height: 1\.08; \}/)
  assert.match(styles, /@media \(max-width: 600px\)[\s\S]*?\.planHero h2 \{ font-size: clamp\(26px, 8vw, 36px\); \}/)
})
