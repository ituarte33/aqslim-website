import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('central entitlement gate remains explicitly shadow-only', async () => {
  const source = await readFile(
    new URL('../lib/entitlement-gate.ts', import.meta.url),
    'utf8',
  )
  assert.match(source, /mode: 'shadow'/)
  assert.match(source, /enforced: false/)
  assert.doesNotMatch(source, /enforced: true/)
})

test('AQ Buddy capability path goes through the centralized AI entitlement boundary', async () => {
  const [authSource, accessSource] = await Promise.all([
    readFile(new URL('../lib/auth.ts', import.meta.url), 'utf8'),
    readFile(new URL('../lib/ai-entitlement-access.ts', import.meta.url), 'utf8'),
  ])
  const capabilityBlock = authSource.slice(authSource.indexOf('export async function requireCapability'))
  assert.match(capabilityBlock, /evaluateAiEntitlementAccess\(/)
  assert.match(capabilityBlock, /capability: 'buddy:chat'/)
  assert.match(capabilityBlock, /currentAccessAllowed: true/)
  assert.match(accessSource, /runEntitlementGateShadow\(/)
})
