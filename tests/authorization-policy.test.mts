import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AuthorizationError,
  assertPatientOwnership,
  assertRoleCapability,
  roleHasCapability,
  selectUniquePatientId,
} from '../lib/authorization-policy.ts'

test('a patient does not receive administrative capabilities', () => {
  assert.equal(roleHasCapability('patient', 'patients:read:any'), false)
  assert.equal(roleHasCapability('patient', 'patients:write:any'), false)
  assert.equal(roleHasCapability('patient', 'consultations:write:any'), false)
  assert.throws(
    () => assertRoleCapability('patient', 'patients:write:any'),
    (error: unknown) => error instanceof AuthorizationError && error.code === 'FORBIDDEN',
  )
})

test('a patient retains only explicitly granted self-service capabilities', () => {
  assert.equal(roleHasCapability('patient', 'portal:read:self'), true)
  assert.equal(roleHasCapability('patient', 'profile:write:self'), true)
  assert.equal(roleHasCapability('patient', 'questionnaire:write:self'), true)
  assert.equal(roleHasCapability('patient', 'appointments:book:self'), true)
  assert.equal(roleHasCapability('patient', 'buddy:chat'), true)
})

test('presenting another patient record ID is rejected', () => {
  assert.doesNotThrow(() => assertPatientOwnership('rec-owned', 'rec-owned'))
  assert.throws(
    () => assertPatientOwnership('rec-owned', 'rec-other'),
    (error: unknown) => error instanceof AuthorizationError && error.code === 'FORBIDDEN',
  )
})

test('a stable Clerk metadata binding takes precedence over email bootstrap matches', () => {
  assert.equal(selectUniquePatientId('rec-bound', ['rec-email']), 'rec-bound')
})

test('email bootstrap fails closed for no match or duplicate matches', () => {
  assert.throws(
    () => selectUniquePatientId(null, []),
    (error: unknown) => error instanceof AuthorizationError && error.code === 'PATIENT_NOT_FOUND',
  )
  assert.throws(
    () => selectUniquePatientId(null, ['rec-one', 'rec-two']),
    (error: unknown) => error instanceof AuthorizationError && error.code === 'PATIENT_IDENTITY_AMBIGUOUS',
  )
})
