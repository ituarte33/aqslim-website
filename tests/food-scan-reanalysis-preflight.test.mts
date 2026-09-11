import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('food reanalysis verifies ownership before any provider call', async () => {
  const source = await readFile(
    new URL('../app/api/food-scan/route.ts', import.meta.url),
    'utf8',
  )
  const reanalysisStart = source.indexOf("if (payload.action === 'reanalyze')")
  assert.ok(reanalysisStart >= 0)

  const reanalysis = source.slice(reanalysisStart)
  const ownershipCheck = reanalysis.indexOf('getMealLogForUser(mealLogId, userId)')
  const providerCall = reanalysis.indexOf('client.messages.create({')

  assert.ok(ownershipCheck >= 0)
  assert.ok(providerCall >= 0)
  assert.ok(ownershipCheck < providerCall)
  assert.match(reanalysis, /Consumption Status.*Unconfirmed/)
})

test('food reanalysis usage evaluation remains shadow-only', async () => {
  const source = await readFile(
    new URL('../app/api/food-scan/route.ts', import.meta.url),
    'utf8',
  )
  const reanalysisStart = source.indexOf("if (payload.action === 'reanalyze')")
  const reanalysis = source.slice(reanalysisStart)

  assert.match(reanalysis, /observeUsageShadow\(/)
  assert.match(reanalysis, /currentUsageCounted: false/)
  assert.doesNotMatch(reanalysis, /if \(!shadowUsageDecision\.allowed\)/)
})
