import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { getClinicAccessActivationReadiness } from '../lib/clinic-access-activation-readiness.ts'
import { getClinicAccessReadiness } from '../lib/clinic-access-readiness.ts'
import { getClinicAccessReconciliation } from '../lib/clinic-access-reconciliation.ts'

const patientId = 'recABCDEFGHIJKLMN'

function buildScenario({
  accounts,
  entitlement = null,
  pilotRecognitionAuthorized = true,
}: {
  accounts: Parameters<typeof getClinicAccessReconciliation>[0]['accounts']
  entitlement?: Parameters<typeof getClinicAccessReadiness>[0]['entitlement']
  pilotRecognitionAuthorized?: boolean
}) {
  const readiness = getClinicAccessReadiness({
    patientId,
    email: 'rom@ituarteconsulting.com',
    phone: '(619) 392-0797',
    language: 'Español',
    entitlement,
  })
  const reconciliation = getClinicAccessReconciliation({ patientId, accounts })
  return getClinicAccessActivationReadiness({ readiness, reconciliation, pilotRecognitionAuthorized })
}

test('proposes binding and pilot recognition but requires an entitlement decision', () => {
  const result = buildScenario({
    accounts: [{
      boundPatientId: null,
      hasPilotAccess: false,
      isCurrentSession: true,
      hasExplicitPilotMetadata: false,
      legacyPilotPolicyApplies: false,
    }],
  })

  assert.equal(result.state, 'ready_for_authorization')
  assert.equal(result.steps.find(step => step.key === 'patient_binding')?.state, 'proposed')
  assert.equal(result.steps.find(step => step.key === 'pilot_recognition')?.state, 'proposed')
  assert.equal(result.steps.find(step => step.key === 'preview_entitlement')?.state, 'decision_required')
  assert.match(result.notice, /ninguna acción fue ejecutada/)
})

test('blocks every proposed write when the account is bound to another patient', () => {
  const result = buildScenario({
    accounts: [{
      boundPatientId: 'recZZZZZZZZZZZZZZ',
      hasPilotAccess: false,
      isCurrentSession: true,
      hasExplicitPilotMetadata: false,
      legacyPilotPolicyApplies: false,
    }],
  })

  assert.equal(result.state, 'blocked')
  assert.equal(result.steps.find(step => step.key === 'patient_binding')?.state, 'blocked')
  assert.equal(result.steps.find(step => step.key === 'pilot_recognition')?.state, 'blocked')
  assert.equal(result.steps.find(step => step.key === 'preview_entitlement')?.state, 'blocked')
})

test('fails closed for missing, ambiguous, or unavailable accounts', () => {
  for (const accounts of [[], null, [
    { boundPatientId: null, hasPilotAccess: false, isCurrentSession: false, hasExplicitPilotMetadata: false, legacyPilotPolicyApplies: false },
    { boundPatientId: null, hasPilotAccess: false, isCurrentSession: false, hasExplicitPilotMetadata: false, legacyPilotPolicyApplies: false },
  ]]) {
    assert.equal(buildScenario({ accounts }).state, 'blocked')
  }
})

test('reports no action when binding, pilot, and entitlement already exist', () => {
  const result = buildScenario({
    accounts: [{
      boundPatientId: patientId,
      hasPilotAccess: true,
      isCurrentSession: true,
      hasExplicitPilotMetadata: true,
      legacyPilotPolicyApplies: false,
    }],
    entitlement: { present: true, binding: 'linked', tier: 'existing-tier', status: 'active' },
  })

  assert.equal(result.state, 'no_action')
  assert.ok(result.steps.every(step => step.state === 'complete'))
})

test('does not propose pilot recognition for an unapproved selected account', () => {
  const result = buildScenario({
    accounts: [{
      boundPatientId: null,
      hasPilotAccess: false,
      isCurrentSession: false,
      hasExplicitPilotMetadata: false,
      legacyPilotPolicyApplies: false,
    }],
    pilotRecognitionAuthorized: false,
  })

  assert.equal(result.state, 'blocked')
  assert.equal(result.steps.find(step => step.key === 'pilot_recognition')?.state, 'blocked')
})

test('the readiness route remains GET-only and contains no mutation wiring', async () => {
  const source = await readFile(new URL('../app/api/preview/clinic-access-readiness/route.ts', import.meta.url), 'utf8')

  assert.match(source, /export async function GET/)
  assert.doesNotMatch(source, /export async function (POST|PUT|PATCH|DELETE)/)
  assert.doesNotMatch(source, /users\.updateUser|createUser|claimPendingPreviewEntitlementSubject|updatePreviewEntitlement/)
})
