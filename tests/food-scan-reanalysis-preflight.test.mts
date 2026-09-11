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

test('non-owned meal logs fail closed before provider execution', async () => {
  const [routeSource, airtableSource] = await Promise.all([
    readFile(new URL('../app/api/food-scan/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../lib/airtable.ts', import.meta.url), 'utf8'),
  ])

  const ownershipFunctionStart = airtableSource.indexOf('export async function getMealLogForUser')
  assert.ok(ownershipFunctionStart >= 0)
  const ownershipFunction = airtableSource.slice(ownershipFunctionStart, ownershipFunctionStart + 900)
  assert.match(ownershipFunction, /record\.fields\['User ID'\] === userId \? record : null/)

  const reanalysisStart = routeSource.indexOf("if (payload.action === 'reanalyze')")
  assert.ok(reanalysisStart >= 0)
  const reanalysis = routeSource.slice(reanalysisStart)
  const lookup = reanalysis.indexOf('getMealLogForUser(mealLogId, userId)')
  const notOwnedRejection = reanalysis.indexOf("if (!ownedMealLog) return Response.json({ error: 'not_found' }, { status: 404 })")
  const providerCall = reanalysis.indexOf('client.messages.create({')

  assert.ok(lookup >= 0)
  assert.ok(notOwnedRejection > lookup)
  assert.ok(providerCall > notOwnedRejection)
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
