import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { getClinicAccessAuthorizationGate } from '../lib/clinic-access-authorization.ts'

const recommended = {
  state: 'recommended' as const,
  stateLabel: 'Entitlement Preview recomendado',
  tier: 'internal_pilot',
  status: 'active',
  source: 'internal_pilot',
  scope: 'preview_only' as const,
  billing: 'none' as const,
  lifecycle: 'pilot_only' as const,
  reason: 'authorized',
  notice: 'read-only',
}

const ready = {
  state: 'ready_for_authorization' as const,
  stateLabel: 'ready',
  notice: 'proposal only',
  checks: [],
  steps: [],
}

test('creates a stable session authorization fingerprint for the exact Preview proposal', () => {
  const first = getClinicAccessAuthorizationGate({ patientId: 'recABCDEFGHIJKLMN', patientEmail: 'ROM@ituarteconsulting.com', activation: ready, entitlementDecision: recommended })
  const second = getClinicAccessAuthorizationGate({ patientId: 'recABCDEFGHIJKLMN', patientEmail: 'rom@ituarteconsulting.com', activation: ready, entitlementDecision: recommended })

  assert.equal(first.state, 'ready')
  assert.equal(first.operationFingerprint, second.operationFingerprint)
  assert.equal(first.acknowledgements.length, 3)
  assert.equal(first.executionEnabled, false)
})

test('binds duplicate protection to the selected patient', () => {
  const first = getClinicAccessAuthorizationGate({ patientId: 'recABCDEFGHIJKLMN', patientEmail: 'rom@ituarteconsulting.com', activation: ready, entitlementDecision: recommended })
  const other = getClinicAccessAuthorizationGate({ patientId: 'recOTHERPATIENT123', patientEmail: 'rom@ituarteconsulting.com', activation: ready, entitlementDecision: recommended })

  assert.notEqual(first.operationFingerprint, other.operationFingerprint)
  assert.equal(first.duplicateProtection, 'fingerprint_bound')
})

test('fails closed for a blocked activation or a non-exact entitlement', () => {
  const blocked = getClinicAccessAuthorizationGate({ patientId: 'recABCDEFGHIJKLMN', patientEmail: 'rom@ituarteconsulting.com', activation: { ...ready, state: 'blocked' }, entitlementDecision: recommended })
  const wrongTier = getClinicAccessAuthorizationGate({ patientId: 'recABCDEFGHIJKLMN', patientEmail: 'rom@ituarteconsulting.com', activation: ready, entitlementDecision: { ...recommended, tier: 'clinic_ai' } })

  assert.equal(blocked.state, 'blocked')
  assert.equal(blocked.operationFingerprint, null)
  assert.equal(wrongTier.state, 'blocked')
  assert.equal(wrongTier.operationFingerprint, null)
})

test('authorization remains read-only and exposes no execution route', async () => {
  const route = await readFile(new URL('../app/api/preview/clinic-access-readiness/route.ts', import.meta.url), 'utf8')
  const client = await readFile(new URL('../app/clinic-preview/clinic-preview-client.tsx', import.meta.url), 'utf8')

  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/)
  assert.doesNotMatch(route, /createPreviewEntitlement|updatePreviewEntitlement|users\.updateUser/)
  assert.match(client, /Ejecutar activación · bloqueado hasta fase ejecutable/)
})
