import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('D10 checks the per-scan correction limit before the reanalysis provider call', async () => {
  const source = await readFile(new URL('../app/api/food-scan/route.ts', import.meta.url), 'utf8')
  const start = source.indexOf("if (payload.action === 'reanalyze')")
  assert.ok(start >= 0)
  const reanalysis = source.slice(start)
  const limitCheck = reanalysis.indexOf('getPreviewReanalysisUsage(userId, mealLogId)')
  const provider = reanalysis.indexOf('client.messages.create({')
  assert.ok(limitCheck >= 0)
  assert.ok(provider >= 0)
  assert.ok(limitCheck < provider)
  assert.match(reanalysis, /reanalysis_limit_reached/)
})

test('D10 does not count a correction as another daily or monthly scan', async () => {
  const source = await readFile(new URL('../app/api/food-scan/route.ts', import.meta.url), 'utf8')
  const start = source.indexOf("if (payload.action === 'reanalyze')")
  const reanalysis = source.slice(start)
  assert.match(reanalysis, /currentUsageCounted:\s*false/)
  assert.doesNotMatch(reanalysis, /dailyUsed\s*\+\s*1/)
  assert.doesNotMatch(reanalysis, /monthlyUsed\s*\+\s*1/)
})

test('D10 records only a successful persisted correction', async () => {
  const source = await readFile(new URL('../app/api/food-scan/route.ts', import.meta.url), 'utf8')
  const start = source.indexOf("if (payload.action === 'reanalyze')")
  const reanalysis = source.slice(start)
  const persistence = reanalysis.indexOf('updateUnconfirmedMealLogEstimate(mealLogId, userId')
  const audit = reanalysis.indexOf('recordPreviewReanalysisCompleted(userId, mealLogId)')
  assert.ok(persistence >= 0)
  assert.ok(audit >= 0)
  assert.ok(persistence < audit)
})

test('scanner exposes Clinic AI and the two-correction experience', async () => {
  const source = await readFile(new URL('../app/food-scanner/scanner-client.tsx', import.meta.url), 'utf8')
  assert.match(source, /clinic_ai:\s*'Clinic AI'/)
  assert.match(source, /reanalysisRemaining/)
  assert.match(source, /2 correcciones disponibles/)
  assert.match(source, /2 corrections available/)
})

test('D10 audit storage is isolated to the exact P3 Preview branch', async () => {
  const source = await readFile(new URL('../lib/preview-reanalysis-store.ts', import.meta.url), 'utf8')
  assert.match(source, /VERCEL_ENV === 'preview'/)
  assert.match(source, /VERCEL_GIT_COMMIT_REF === ENTITLEMENT_P3_PREVIEW_BRANCH/)
  assert.match(source, /PREVIEW_REANALYSIS_TABLE/)
})
