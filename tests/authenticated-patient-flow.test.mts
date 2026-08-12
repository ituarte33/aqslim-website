import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AuthorizationError,
  resolveAuthenticatedPatientScope,
  roleHasCapability,
} from '../lib/authorization-policy.ts'

const fictionalPatients = {
  maria: {
    role: 'patient' as const,
    boundPatientId: 'rec_test_maria',
    matchingPatientIds: ['rec_test_other_email_match'],
  },
  jose: {
    role: 'patient' as const,
    boundPatientId: null,
    matchingPatientIds: ['rec_test_jose'],
  },
}

test('each authenticated fictional patient resolves only their own record', () => {
  assert.equal(resolveAuthenticatedPatientScope(fictionalPatients.maria), 'rec_test_maria')
  assert.equal(resolveAuthenticatedPatientScope(fictionalPatients.jose), 'rec_test_jose')
})

test('a stable Clerk binding wins over a conflicting email bootstrap match', () => {
  assert.equal(
    resolveAuthenticatedPatientScope(fictionalPatients.maria),
    fictionalPatients.maria.boundPatientId,
  )
})

test('one fictional patient cannot request the other fictional patient record', () => {
  assert.equal(
    resolveAuthenticatedPatientScope({
      ...fictionalPatients.maria,
      requestedPatientId: 'rec_test_maria',
    }),
    'rec_test_maria',
  )
  assert.throws(
    () => resolveAuthenticatedPatientScope({
      ...fictionalPatients.maria,
      requestedPatientId: 'rec_test_jose',
    }),
    (error: unknown) => error instanceof AuthorizationError && error.code === 'FORBIDDEN',
  )
})

test('the authenticated patient flow grants self-service but no administrative access', () => {
  assert.equal(roleHasCapability('patient', 'portal:read:self'), true)
  assert.equal(roleHasCapability('patient', 'buddy:chat'), true)
  assert.equal(roleHasCapability('patient', 'patients:read:any'), false)
  assert.equal(roleHasCapability('patient', 'patients:write:any'), false)
})

test('ambiguous or missing bootstrap identity fails closed', () => {
  const cases = [
    { matchingPatientIds: [] as string[], code: 'PATIENT_NOT_FOUND' },
    { matchingPatientIds: ['rec_test_one', 'rec_test_two'], code: 'PATIENT_IDENTITY_AMBIGUOUS' },
  ] as const

  for (const { matchingPatientIds, code } of cases) {
    assert.throws(
      () => resolveAuthenticatedPatientScope({
        role: 'patient',
        boundPatientId: null,
        matchingPatientIds,
      }),
      (error: unknown) => error instanceof AuthorizationError
        && error.code === code,
    )
  }
})
