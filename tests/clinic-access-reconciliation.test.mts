import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { getClinicAccessReconciliation } from '../lib/clinic-access-reconciliation.ts'

const patientId = 'recABCDEFGHIJKLMN'

test('reconciles an existing bound account with active pilot access', () => {
  const result = getClinicAccessReconciliation({
    patientId,
    accounts: [{ boundPatientId: patientId, hasPilotAccess: true }],
  })

  assert.equal(result.state, 'consistent')
  assert.equal(result.account.state, 'found')
  assert.equal(result.binding.state, 'matched')
  assert.equal(result.pilot.state, 'active')
})

test('treats a unique email match without metadata as pending explicit binding', () => {
  const result = getClinicAccessReconciliation({
    patientId,
    accounts: [{ boundPatientId: null, hasPilotAccess: true }],
  })

  assert.equal(result.state, 'consistent')
  assert.equal(result.binding.state, 'email_match')
  assert.match(result.binding.label, /email/)
})

test('flags a binding to another patient record for review', () => {
  const result = getClinicAccessReconciliation({
    patientId,
    accounts: [{ boundPatientId: 'recZZZZZZZZZZZZZZ', hasPilotAccess: true }],
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
      { boundPatientId: null, hasPilotAccess: true },
      { boundPatientId: patientId, hasPilotAccess: true },
    ],
  })

  assert.equal(result.state, 'review_needed')
  assert.equal(result.account.state, 'ambiguous')
})

test('does not claim pilot access when it was not observed', () => {
  const result = getClinicAccessReconciliation({
    patientId,
    accounts: [{ boundPatientId: patientId, hasPilotAccess: false }],
  })

  assert.equal(result.state, 'review_needed')
  assert.equal(result.pilot.state, 'not_confirmed')
})

test('the reconciliation route reads Clerk without provisioning or mutation calls', async () => {
  const source = await readFile(new URL('../app/api/preview/clinic-access-readiness/route.ts', import.meta.url), 'utf8')

  assert.match(source, /users\.getUserList/)
  assert.doesNotMatch(source, /users\.updateUser|createUser|claimPendingPreviewEntitlementSubject/)
})
