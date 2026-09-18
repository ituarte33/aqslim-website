import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

test('P4 provisioning is hard-gated to exact Preview branch and AQSLIM Preview base', async () => {
  const writer = await source('lib/p4-preview-entitlement-provisioning.ts')
  assert.match(writer, /process\.env\.VERCEL_ENV === 'preview'/)
  assert.match(writer, /process\.env\.VERCEL_GIT_COMMIT_REF === ENTITLEMENT_P4_PREVIEW_BRANCH/)
  assert.match(writer, /process\.env\.AIRTABLE_BASE_ID === SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID/)
  assert.match(writer, /Boolean\(process\.env\.AIRTABLE_PAT\)/)
})

test('consultation commit occurs before P4 entitlement provisioning and provisioning failures do not fake a consultation failure', async () => {
  const action = await source('app/dashboard/consulta-subsecuente/actions.ts')
  const createIndex = action.indexOf('const consulta = await createConsulta(fields)')
  const provisionIndex = action.indexOf('await provisionClinicEntitlementForCompletedVisit({')
  const returnIndex = action.indexOf('return { id: consulta.id }')

  assert.ok(createIndex >= 0, 'consultation commit must exist')
  assert.ok(provisionIndex > createIndex, 'provisioning must run after consultation commit')
  assert.ok(returnIndex > provisionIndex, 'consultation should still return success after provisioning block')
  assert.match(action, /failed_after_consultation_commit/)
  assert.match(action, /catch \(error\)/)
})

test('P4 entitlement context falls back by stable patient record and rejects a different claimed subject', async () => {
  const context = await source('lib/entitlement-context.ts')
  assert.match(context, /getPreviewEntitlementSourceRecordByPatientRecordId/)
  assert.match(context, /pendingPatientSubjectId\(authenticatedPatientRecordId\)/)
  assert.match(context, /patientSource\.storedSubjectId !== pendingSubject/)
  assert.match(context, /patientSource\.storedSubjectId !== subjectId/)
  assert.match(context, /claimPendingPreviewEntitlementSubject/)
})

test('patient identity may fall back to a unique Airtable email match with an isolated Founder canary exception', async () => {
  const auth = await source('lib/auth.ts')
  assert.match(auth, /if \(\(role === 'patient' \|\| founderCanaryIdentity\) && !boundPatientId\)/)
  assert.match(auth, /isP5FounderCanaryIdentity\(\{/)
  assert.match(auth, /const matches = await getClientesByEmail\(email\)/)
  assert.match(auth, /resolveAuthenticatedPatientScope/)
  assert.match(auth, /catch \{\s*boundPatientId = null/s)
})
