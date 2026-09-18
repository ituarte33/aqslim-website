import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  CLINIC_ACCESS_ACKNOWLEDGEMENTS,
  CLINIC_ACCESS_EXECUTION_CONFIRMATION,
  clinicAccessOperationIsExact,
  hasExplicitClinicAccessExecutionConfirmation,
  hasExactClinicAccessAcknowledgements,
  isClinicAccessExecutionEnabled,
} from '../lib/clinic-access-execution-policy.ts'
import { CLINIC_PREVIEW_BRANCH } from '../lib/clinic-preview-policy.ts'
import { SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID } from '../lib/nutrition/synthetic-preview-policy.ts'

const enabledEnvironment = {
  VERCEL_ENV: 'preview',
  VERCEL_GIT_COMMIT_REF: CLINIC_PREVIEW_BRANCH,
  AIRTABLE_BASE_ID: SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID,
  AIRTABLE_PAT: 'configured',
  MYAQ_CLINIC_ACCESS_EXECUTION: 'enabled',
}

test('execution requires every exact Preview environment constraint and an explicit flag', () => {
  assert.equal(isClinicAccessExecutionEnabled(enabledEnvironment), true)
  assert.equal(isClinicAccessExecutionEnabled({ ...enabledEnvironment, VERCEL_ENV: 'production' }), false)
  assert.equal(isClinicAccessExecutionEnabled({ ...enabledEnvironment, VERCEL_GIT_COMMIT_REF: 'main' }), false)
  assert.equal(isClinicAccessExecutionEnabled({ ...enabledEnvironment, AIRTABLE_BASE_ID: 'other' }), false)
  assert.equal(isClinicAccessExecutionEnabled({ ...enabledEnvironment, AIRTABLE_PAT: '' }), false)
  assert.equal(isClinicAccessExecutionEnabled({ ...enabledEnvironment, MYAQ_CLINIC_ACCESS_EXECUTION: undefined }), false)
})

test('server acknowledgement validation is exact', () => {
  assert.equal(hasExactClinicAccessAcknowledgements([...CLINIC_ACCESS_ACKNOWLEDGEMENTS]), true)
  assert.equal(hasExactClinicAccessAcknowledgements(['patient_identity', 'preview_scope']), false)
  assert.equal(hasExactClinicAccessAcknowledgements(['patient_identity', 'patient_identity', 'no_external_effects']), false)
})

test('real execution requires a separate exact confirmation that the UI does not send', () => {
  assert.equal(hasExplicitClinicAccessExecutionConfirmation(CLINIC_ACCESS_EXECUTION_CONFIRMATION), true)
  assert.equal(hasExplicitClinicAccessExecutionConfirmation('activate'), false)
  assert.equal(hasExplicitClinicAccessExecutionConfirmation(undefined), false)
})

test('operation is bound to Rom, his current account, and the current fingerprint', () => {
  const exact = {
    actorEmail: 'rom@ituarteconsulting.com',
    actorUserId: 'user_rom',
    patientEmail: 'ROM@ituarteconsulting.com',
    accountUserId: 'user_rom',
    expectedFingerprint: 'fingerprint-1',
    suppliedFingerprint: 'fingerprint-1',
    authorizationState: 'ready',
    acknowledgements: [...CLINIC_ACCESS_ACKNOWLEDGEMENTS],
  }
  assert.equal(clinicAccessOperationIsExact(exact), true)
  assert.equal(clinicAccessOperationIsExact({ ...exact, patientEmail: 'primo@example.com' }), false)
  assert.equal(clinicAccessOperationIsExact({ ...exact, accountUserId: 'user_other' }), false)
  assert.equal(clinicAccessOperationIsExact({ ...exact, suppliedFingerprint: 'stale' }), false)
  assert.equal(clinicAccessOperationIsExact({ ...exact, authorizationState: 'blocked' }), false)
})

test('activation route validates on the server but execution remains feature-gated', async () => {
  const route = await readFile(new URL('../app/api/preview/clinic-access-activation/route.ts', import.meta.url), 'utf8')
  const executor = await readFile(new URL('../lib/clinic-access-activation-executor.ts', import.meta.url), 'utf8')

  assert.match(route, /resolveClinicAccessSnapshot/)
  assert.match(route, /clinicAccessOperationIsExact/)
  assert.match(route, /if \(!executionEnabled\)/)
  assert.match(route, /execution_disabled/)
  assert.match(route, /execution_confirmation_required/)
  assert.match(executor, /performUpsert/)
  assert.match(executor, /POST_WRITE_VERIFICATION_FAILED/)
  assert.match(executor, /users\.updateUserMetadata/)
  assert.match(executor, /getPreviewEntitlementSourceRecordByPatientRecordId/)
})
