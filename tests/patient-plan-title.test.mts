import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('patient surfaces display the full Clinic-published plan name', async () => {
  const planView = await readFile(new URL('../app/my-aqslim/plan/plan-view.tsx', import.meta.url), 'utf8')
  const homeView = await readFile(new URL('../app/my-aqslim/home-view.tsx', import.meta.url), 'utf8')

  for (const source of [planView, homeView]) {
    assert.match(source, /const planTitle = plan/)
    assert.doesNotMatch(source, /isFast36Hypocaloric \? 'FAST 36' : plan/)
  }
})
