import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

test('AQ Buddy observes entitlement shadow through the existing capability gate', async () => {
  const [authSource, accessSource] = await Promise.all([
    source('lib/auth.ts'),
    source('lib/ai-entitlement-access.ts'),
  ])
  assert.match(authSource, /capability === 'buddy:chat'/)
  assert.match(authSource, /evaluateAiEntitlementAccess\(\{/)
  assert.match(authSource, /capability: 'buddy:chat'/)
  assert.match(accessSource, /runEntitlementGateShadow\(\{/)
})

test('Food Scan observes both initial analysis and correction reanalysis', async () => {
  const route = await source('app/api/food-scan/route.ts')
  assert.match(route, /capability: 'food_scan:analyze'/)
  assert.match(route, /capability: 'food_scan:reanalyze'/)
})

test('Fridge Recipes observes both image detection and recipe generation', async () => {
  const route = await source('app/api/fridge-recipes/route.ts')
  assert.match(route, /body\.action === 'detect'[\s\S]*?'fridge_recipe:detect'/)
  assert.match(route, /body\.action === 'detect'[\s\S]*?'fridge_recipe:generate'/)
  assert.match(route, /evaluateAiEntitlementAccess\(\{[\s\S]*?capability,/)
})

test('Restaurant Advisor retains the original canary observation', async () => {
  const route = await source('app/api/restaurant-advisor/route.ts')
  assert.match(route, /capability: 'restaurant_menu:analyze'/)
})

test('shadow policy remains structurally non-enforcing', async () => {
  const policy = await source('lib/entitlement-shadow-policy.ts')
  assert.match(policy, /enforced: false/)
  assert.doesNotMatch(policy, /enforced: true/)
})
