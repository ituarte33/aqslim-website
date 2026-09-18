import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { getClinicAccessReadiness } from '../lib/clinic-access-readiness.ts'
import { getClinicAccessReconciliation } from '../lib/clinic-access-reconciliation.ts'
import { getClinicEntitlementDecision } from '../lib/clinic-entitlement-decision.ts'

const patientId = 'recABCDEFGHIJKLMN'

function scenario({ authorized = true, email = 'rom@ituarteconsulting.com', accounts, entitlement = null }: {
  authorized?: boolean
  email?: string
  accounts: Parameters<typeof getClinicAccessReconciliation>[0]['accounts']
  entitlement?: Parameters<typeof getClinicAccessReadiness>[0]['entitlement']
}) {
  const readiness = getClinicAccessReadiness({ patientId, email, phone: '6193920797', language: 'Español', entitlement })
  const reconciliation = getClinicAccessReconciliation({ patientId, accounts })
  return getClinicEntitlementDecision({ readiness, reconciliation, pilotRecognitionAuthorized: authorized })
}

test('recommends internal_pilot active only for an authorized Preview candidate', () => {
  const result = scenario({
    accounts: [{ boundPatientId: null, hasPilotAccess: false, isCurrentSession: true, hasExplicitPilotMetadata: false, legacyPilotPolicyApplies: false }],
  })

  assert.equal(result.state, 'recommended')
  assert.equal(result.tier, 'internal_pilot')
  assert.equal(result.status, 'active')
  assert.equal(result.source, 'internal_pilot')
  assert.equal(result.scope, 'preview_only')
  assert.equal(result.billing, 'none')
  assert.equal(result.lifecycle, 'pilot_only')
  assert.match(result.notice, /no se creó el Ledger/)
})

test('fails closed when identity or pilot authorization is missing', () => {
  const missingEmail = scenario({ email: '', accounts: null })
  const unapproved = scenario({
    authorized: false,
    accounts: [{ boundPatientId: null, hasPilotAccess: false, isCurrentSession: false, hasExplicitPilotMetadata: false, legacyPilotPolicyApplies: false }],
  })

  assert.equal(missingEmail.state, 'blocked')
  assert.equal(missingEmail.tier, null)
  assert.equal(unapproved.state, 'blocked')
  assert.equal(unapproved.tier, null)
})

test('preserves an existing Preview entitlement instead of recommending a replacement', () => {
  const result = scenario({
    accounts: [{ boundPatientId: patientId, hasPilotAccess: true, isCurrentSession: true, hasExplicitPilotMetadata: true, legacyPilotPolicyApplies: false }],
    entitlement: { present: true, binding: 'linked', tier: 'clinic_ai', status: 'trial' },
  })

  assert.equal(result.state, 'existing')
  assert.equal(result.tier, 'clinic_ai')
  assert.equal(result.status, 'trial')
  assert.equal(result.scope, null)
  assert.equal(result.billing, null)
  assert.equal(result.lifecycle, null)
})

test('the Clinic readiness route has no entitlement, Clerk, or account mutation wiring', async () => {
  const source = await readFile(new URL('../app/api/preview/clinic-access-readiness/route.ts', import.meta.url), 'utf8')

  assert.doesNotMatch(source, /createPreviewEntitlement|updatePreviewEntitlement|claimPendingPreviewEntitlementSubject/)
  assert.doesNotMatch(source, /users\.updateUser|users\.createUser|invitations\.createInvitation/)
  assert.doesNotMatch(source, /export async function (POST|PUT|PATCH|DELETE)/)
})
