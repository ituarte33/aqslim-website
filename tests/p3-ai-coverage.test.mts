import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('AQ Buddy uses the centralized current-vs-P3 entitlement helper', async () => {
  const source = await readFile(new URL('../lib/auth.ts', import.meta.url), 'utf8')
  assert.match(source, /evaluateAiEntitlementAccess\(/)
  assert.match(source, /capability: 'buddy:chat'/)
  assert.match(source, /if \(!access\.allowed\) throw new AuthorizationError\('FORBIDDEN'\)/)
})

test('Food Scan initial analysis follows identity -> entitlement -> usage -> provider ordering', async () => {
  const source = await readFile(new URL('../app/api/food-scan/route.ts', import.meta.url), 'utf8')
  const start = source.indexOf('export async function POST')
  const post = source.slice(start, source.indexOf('export async function PATCH'))
  const identity = post.indexOf('await auth()')
  const entitlement = post.indexOf('evaluateAiEntitlementAccess({')
  const usage = post.indexOf('countScansBetween(')
  const provider = post.indexOf('client.messages.create({')
  assert.ok(identity >= 0 && entitlement > identity && usage > entitlement && provider > usage)
  assert.match(post, /capability: 'food_scan:analyze'/)
  assert.match(source, /function effectiveUsageContext[\s\S]*?usagePolicyForEntitlementTier/)
})

test('Food Scan reanalysis verifies ownership and entitlement before its provider call', async () => {
  const source = await readFile(new URL('../app/api/food-scan/route.ts', import.meta.url), 'utf8')
  const start = source.indexOf("if (payload.action === 'reanalyze')")
  const reanalysis = source.slice(start)
  const ownership = reanalysis.indexOf('getMealLogForUser(mealLogId, userId)')
  const entitlement = reanalysis.indexOf('evaluateAiEntitlementAccess({')
  const usageObservation = reanalysis.indexOf('observeUsageShadow({')
  const provider = reanalysis.indexOf('client.messages.create({')
  assert.ok(ownership >= 0 && entitlement > ownership && usageObservation > entitlement && provider > usageObservation)
  assert.match(reanalysis, /capability: 'food_scan:reanalyze'/)
  assert.match(reanalysis, /currentUsageCounted: false/)
})

test('Fridge detect and generation share the centralized entitlement access boundary', async () => {
  const source = await readFile(new URL('../app/api/fridge-recipes/route.ts', import.meta.url), 'utf8')
  assert.match(source, /evaluateAiEntitlementAccess\(/)
  assert.match(source, /'fridge_recipe:detect'/)
  assert.match(source, /'fridge_recipe:generate'/)
  assert.match(source, /if \(!access\.allowed\) return Response\.json\(\{ error: 'Forbidden' \}/)
})

test('Restaurant Advisor uses centralized entitlement access before provider execution', async () => {
  const source = await readFile(new URL('../app/api/restaurant-advisor/route.ts', import.meta.url), 'utf8')
  const post = source.slice(source.indexOf('export async function POST'))
  const entitlement = post.indexOf('evaluateAiEntitlementAccess({')
  const provider = post.indexOf('requestRestaurantAnalysis(')
  assert.ok(entitlement >= 0 && provider > entitlement)
  assert.match(post, /capability: 'restaurant_menu:analyze'/)
})

test('Weekly Summary is entitlement-gated but remains deterministic without an AI provider call', async () => {
  const source = await readFile(new URL('../app/my-aqslim/pilot/weekly-summary/page.tsx', import.meta.url), 'utf8')
  assert.match(source, /evaluateAiEntitlementAccess\(/)
  assert.match(source, /capability: 'weekly_summary:generate'/)
  assert.match(source, /buildWeeklySummary\(/)
  assert.doesNotMatch(source, /Anthropic|OpenAI|client\.messages\.create/)
})
