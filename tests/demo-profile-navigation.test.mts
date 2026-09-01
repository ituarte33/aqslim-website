import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { demoProfilePath, firstProfileParam } from '../lib/demo-profile-route.ts'

const PORTAL_SHELL = new URL('../app/my-aqslim/portal-shell.tsx', import.meta.url)
const GUIDED_PLAN = new URL('../app/my-aqslim/plan/guided-plan-view.tsx', import.meta.url)
const HOME_VIEW = new URL('../app/my-aqslim/home-view.tsx', import.meta.url)
const DEMO_CONTEXT = new URL('../lib/patient-portal-demo.ts', import.meta.url)
const DEMO_PAGES = [
  '../app/my-aqslim/demo/page.tsx',
  '../app/my-aqslim/demo/progress/page.tsx',
  '../app/my-aqslim/demo/materials/page.tsx',
  '../app/my-aqslim/demo/buddy/page.tsx',
].map(path => new URL(path, import.meta.url))

test('adds a synthetic profile only to demo navigation', () => {
  assert.equal(
    demoProfilePath('/my-aqslim/demo/plan', true, 'SYN-JING-ELENA-1400'),
    '/my-aqslim/demo/plan?profile=SYN-JING-ELENA-1400',
  )
  assert.equal(demoProfilePath('/my-aqslim/plan', false, 'SYN-JING-ELENA-1400'), '/my-aqslim/plan')
  assert.equal(demoProfilePath('/my-aqslim/demo', true), '/my-aqslim/demo')
  assert.equal(firstProfileParam(['SYN-JING-SOFIA-1800', 'ignored']), 'SYN-JING-SOFIA-1800')
})

test('the demo shell and primary links preserve the selected profile', async () => {
  const [shell, guidedPlan, homeView] = await Promise.all([
    readFile(PORTAL_SHELL, 'utf8'),
    readFile(GUIDED_PLAN, 'utf8'),
    readFile(HOME_VIEW, 'utf8'),
  ])

  assert.match(shell, /demoProfilePath\(basePath, demo, demoProfileId\)/)
  assert.match(shell, /demoProfilePath\(itemPath, demo, demoProfileId\)/)
  assert.match(guidedPlan, /demoProfiles\.map/)
  assert.match(guidedPlan, /aria-current=\{profile\.id === plan\.profile\.id \? 'page'/)
  assert.match(guidedPlan, /demoProfileId=\{plan\.profile\.id\}/)
  assert.match(homeView, /demoProfilePath\(demo \? '\/my-aqslim\/demo\/plan'/)
  assert.match(homeView, /demoProfileId=\{demoProfileId\}/)
})

test('every primary demo surface rebuilds the same synthetic identity', async () => {
  const [context, ...pages] = await Promise.all([
    readFile(DEMO_CONTEXT, 'utf8'),
    ...DEMO_PAGES.map(page => readFile(page, 'utf8')),
  ])

  assert.match(context, /buildSyntheticPersonalizationPlan\(profileId\)/)
  assert.match(context, /firstName: plan\.profile\.firstName/)
  assert.match(context, /fullName: `\$\{plan\.profile\.firstName\} · Perfil sintético`/)
  assert.doesNotMatch(context, /airtable/i)
  for (const page of pages) {
    assert.match(page, /buildSyntheticDemoContext\(firstProfileParam\(params\.profile\)\)/)
    assert.match(page, /demoProfileId=\{plan\.profile\.id\}/)
  }
})
