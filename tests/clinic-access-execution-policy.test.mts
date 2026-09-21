import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  CLINIC_ACCESS_ACKNOWLEDGEMENTS,
  CLINIC_ACCESS_EXECUTION_CONFIRMATION,
  clinicAccessPilotRoleForOperation,
  clinicAccessOperationIsExact,
  clinicPilotPatientIds,
  hasExplicitClinicAccessExecutionConfirmation,
  hasExactClinicAccessAcknowledgements,
  isClinicPilotPatientAllowlisted,
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

test('real execution requires a separate exact confirmation', () => {
  assert.equal(hasExplicitClinicAccessExecutionConfirmation(CLINIC_ACCESS_EXECUTION_CONFIRMATION), true)
  assert.equal(hasExplicitClinicAccessExecutionConfirmation('activate'), false)
  assert.equal(hasExplicitClinicAccessExecutionConfirmation(undefined), false)
})

test('pilot allowlist accepts only exact stable Airtable record IDs', () => {
  const value = ' recABCDEFGHIJKLMN,invalid,recOTHERPATIENT12, recABCDEFGHIJKLMN '
  assert.deepEqual([...clinicPilotPatientIds(value)], ['recABCDEFGHIJKLMN', 'recOTHERPATIENT12'])
  assert.equal(isClinicPilotPatientAllowlisted(value, 'recOTHERPATIENT12'), true)
  assert.equal(isClinicPilotPatientAllowlisted(value, 'recNOTALLOWLISTED1'), false)
  assert.equal(isClinicPilotPatientAllowlisted(undefined, 'recABCDEFGHIJKLMN'), false)
})

test('activation assigns founder only to the protected P5 migration', () => {
  assert.equal(clinicAccessPilotRoleForOperation('migrate_p5_canary'), 'founder')
  assert.equal(clinicAccessPilotRoleForOperation('migrate_clinic_trial'), 'participant')
  assert.equal(clinicAccessPilotRoleForOperation('activate_internal_pilot'), 'participant')
})

test('founder self-operation remains protected and fingerprint-bound', () => {
  const exact = {
    actorEmail: 'rom@ituarteconsulting.com',
    actorUserId: 'user_rom',
    patientId: 'recABCDEFGHIJKLMN',
    patientEmail: 'ROM@ituarteconsulting.com',
    accountUserId: 'user_rom',
    allowlistedPatientIds: undefined,
    expectedFingerprint: 'fingerprint-1',
    suppliedFingerprint: 'fingerprint-1',
    authorizationState: 'ready',
    acknowledgements: [...CLINIC_ACCESS_ACKNOWLEDGEMENTS],
  }
  assert.equal(clinicAccessOperationIsExact(exact), true)
  assert.equal(clinicAccessOperationIsExact({ ...exact, patientEmail: 'primo@example.com' }), false)
  assert.equal(clinicAccessOperationIsExact({ ...exact, actorEmail: 'other@example.com' }), false)
  assert.equal(clinicAccessOperationIsExact({ ...exact, suppliedFingerprint: 'stale' }), false)
  assert.equal(clinicAccessOperationIsExact({ ...exact, authorizationState: 'blocked' }), false)
})

test('founder can target one allowlisted participant account but not an arbitrary patient', () => {
  const target = {
    actorEmail: 'rom@ituarteconsulting.com',
    actorUserId: 'user_rom',
    patientId: 'recOTHERPATIENT12',
    patientEmail: 'participant@example.com',
    accountUserId: 'user_participant',
    allowlistedPatientIds: 'recOTHERPATIENT12',
    expectedFingerprint: 'fingerprint-2',
    suppliedFingerprint: 'fingerprint-2',
    authorizationState: 'ready',
    acknowledgements: [...CLINIC_ACCESS_ACKNOWLEDGEMENTS],
  }
  assert.equal(clinicAccessOperationIsExact(target), true)
  assert.equal(clinicAccessOperationIsExact({ ...target, allowlistedPatientIds: '' }), false)
  assert.equal(clinicAccessOperationIsExact({ ...target, patientId: 'recNOTALLOWLISTED1' }), false)
  assert.equal(clinicAccessOperationIsExact({ ...target, accountUserId: null }), false)
})

test('activation route validates on the server but execution remains feature-gated', async () => {
  const route = await readFile(new URL('../app/api/preview/clinic-access-activation/route.ts', import.meta.url), 'utf8')
  const executor = await readFile(new URL('../lib/clinic-access-activation-executor.ts', import.meta.url), 'utf8')
  const vercel = await readFile(new URL('../vercel.json', import.meta.url), 'utf8')

  assert.match(route, /resolveClinicAccessSnapshot/)
  assert.match(route, /clinicAccessOperationIsExact/)
  assert.match(route, /if \(!executionEnabled\)/)
  assert.match(route, /execution_disabled/)
  assert.match(route, /execution_confirmation_required/)
  assert.match(route, /clerkUserId: snapshot\.accountUserId/)
  assert.doesNotMatch(route, /clerkUserId: actor\.clerkUserId/)
  assert.match(executor, /async function createEntitlement/)
  assert.match(executor, /body: JSON\.stringify\(\{ fields \}\)/)
  assert.doesNotMatch(executor, /performUpsert/)
  assert.match(executor, /clinic_access_activation_failed/)
  assert.match(route, /clinic_access_activation_blocked/)
  assert.match(executor, /clinicAccessPilotRoleForOperation/)
  assert.match(executor, /POST_WRITE_VERIFICATION_FAILED/)
  assert.match(executor, /users\.updateUserMetadata/)
  assert.match(executor, /getPreviewEntitlementSourceRecordByPatientRecordId/)
  assert.match(executor, /isAuthorizedClinicTrialStoredSubject/)
  assert.match(executor, /\[PREVIEW_ENTITLEMENT_FIELDS\.SUBJECT_ID\]: clerkUserId/)
  assert.match(vercel, /"MYAQ_CLINIC_ACCESS_EXECUTION"\s*:\s*"enabled"/)
})
