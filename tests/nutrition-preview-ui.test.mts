import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const CLIENT_VIEW = new URL('../app/my-aqslim/plan/guided-plan-view.tsx', import.meta.url)
const CLIENT_DEMO = new URL('../app/my-aqslim/demo/plan/page.tsx', import.meta.url)
const REAL_PLAN = new URL('../app/my-aqslim/plan/page.tsx', import.meta.url)
const DASHBOARD_PAGE = new URL('../app/dashboard/plan-preview/page.tsx', import.meta.url)
const DASHBOARD_CLIENT = new URL('../app/dashboard/plan-preview/plan-preview-client.tsx', import.meta.url)

test('the client demo uses only the deterministic synthetic plan', async () => {
  const [view, demo] = await Promise.all([
    readFile(CLIENT_VIEW, 'utf8'),
    readFile(CLIENT_DEMO, 'utf8'),
  ])
  assert.match(demo, /buildSyntheticGuidedPlan/)
  assert.match(demo, /getRole\(\).*admin/)
  assert.doesNotMatch(demo, /airtable/i)
  assert.match(view, /plan\.groups\.map/)
  assert.match(view, /¿Qué se te antoja\?/)
  assert.match(view, /Quiero decidir con mi lista/)
  assert.match(view, /<details/)
  assert.match(view, /aqslim_buddy_open_arms\.png/)
  assert.doesNotMatch(view, /Snack/)
})

test('the real patient plan route remains connected to its existing portal data', async () => {
  const route = await readFile(REAL_PLAN, 'utf8')
  assert.doesNotMatch(route, /nutrition\/preview|buildSyntheticGuidedPlan/)
})

test('the Dashboard Preview is admin-only and has no persistence path', async () => {
  const [page, client] = await Promise.all([
    readFile(DASHBOARD_PAGE, 'utf8'),
    readFile(DASHBOARD_CLIENT, 'utf8'),
  ])
  assert.match(page, /actor\.role !== 'admin'/)
  assert.match(page, /buildSyntheticGuidedPlan/)
  assert.doesNotMatch(page, /airtable/i)
  assert.match(client, /disabled>.*Guardar borrador/)
  assert.match(client, /disabled>.*Aprobar y publicar/)
  assert.doesNotMatch(client, /fetch\(|createRecord|updateRecord|from ['\"]@\/lib\/airtable/)
})
