import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { getClinicAccessReconciliation } from '../lib/clinic-access-reconciliation.ts'

const patientId = 'recABCDEFGHIJKLMN'
const account = (overrides: Partial<{
  boundPatientId: string | null
  hasPilotAccess: boolean
  isCurrentSession: boolean
  hasExplicitPilotMetadata: boolean
  legacyPilotPolicyApplies: boolean
}> = {}) => ({
  boundPatientId: patientId,
  hasPilotAccess: true,
  isCurrentSession: true,
  hasExplicitPilotMetadata: true,
  legacyPilotPolicyApplies: false,
  ...overrides,
})

test('reconciles an existing bound account with active pilot access', () => {
  const result = getClinicAccessReconciliation({
    patientId,
    accounts: [account()],
  })

  assert.equal(result.state, 'consistent')
  assert.equal(result.account.state, 'found')
  assert.equal(result.binding.state, 'matched')
  assert.equal(result.pilot.state, 'active')
  assert.match(result.provenance.conclusion, /fuente válida/)
})

test('treats a unique email match without metadata as pending explicit binding', () => {
  const result = getClinicAccessReconciliation({
    patientId,
    accounts: [account({ boundPatientId: null })],
  })

  assert.equal(result.state, 'consistent')
  assert.equal(result.binding.state, 'email_match')
  assert.match(result.binding.label, /email/)
})

test('flags a binding to another patient record for review', () => {
  const result = getClinicAccessReconciliation({
    patientId,
    accounts: [account({ boundPatientId: 'recZZZZZZZZZZZZZZ' })],
  })

  assert.equal(result.state, 'review_needed')
  assert.equal(result.binding.state, 'conflict')
})

test('distinguishes no account from an unavailable lookup', () => {
  const missing = getClinicAccessReconciliation({ patientId, accounts: [] })
  const unavailable = getClinicAccessReconciliation({ patientId, accounts: null })

  assert.equal(missing.state, 'no_account')
  assert.equal(missing.account.state, 'not_found')
  assert.equal(unavailable.state, 'unavailable')
  assert.equal(unavailable.account.state, 'unavailable')
})

test('fails closed when an email matches several accounts', () => {
  const result = getClinicAccessReconciliation({
    patientId,
    accounts: [
      account({ boundPatientId: null }),
      account(),
    ],
  })

  assert.equal(result.state, 'review_needed')
  assert.equal(result.account.state, 'ambiguous')
})

test('does not claim pilot access when it was not observed', () => {
  const result = getClinicAccessReconciliation({
    patientId,
    accounts: [account({ hasPilotAccess: false, hasExplicitPilotMetadata: false })],
  })

  assert.equal(result.state, 'review_needed')
  assert.equal(result.pilot.state, 'not_confirmed')
})

test('explains Clinic Founder-only access without claiming inherited pilot access', () => {
  const result = getClinicAccessReconciliation({
    patientId,
    accounts: [account({
      boundPatientId: null,
      hasPilotAccess: false,
      hasExplicitPilotMetadata: false,
      legacyPilotPolicyApplies: false,
    })],
  })

  assert.equal(result.provenance.checks.find(check => check.key === 'session_identity')?.state, 'confirmed')
  assert.equal(result.provenance.checks.find(check => check.key === 'clinic_founder_policy')?.state, 'confirmed')
  assert.equal(result.provenance.checks.find(check => check.key === 'explicit_pilot_metadata')?.state, 'absent')
  assert.equal(result.provenance.checks.find(check => check.key === 'legacy_pilot_policy')?.state, 'isolated')
  assert.match(result.provenance.conclusion, /Founder-only de Clinic Preview/)
})

test('the reconciliation route reads Clerk without provisioning or mutation calls', async () => {
  const source = await readFile(new URL('../app/api/preview/clinic-access-readiness/route.ts', import.meta.url), 'utf8')
  const snapshot = await readFile(new URL('../lib/clinic-access-snapshot.ts', import.meta.url), 'utf8')

  assert.match(source, /resolveClinicAccessSnapshot/)
  assert.match(snapshot, /users\.getUserList/)
  assert.doesNotMatch(snapshot, /users\.updateUser|createUser|claimPendingPreviewEntitlementSubject/)
})
