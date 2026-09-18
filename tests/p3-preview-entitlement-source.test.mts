import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('Preview entitlement store is hard-scoped to governed enforcement branches and the approved Airtable base', async () => {
  const source = await readFile(new URL('../lib/preview-entitlement-store.ts', import.meta.url), 'utf8')
  assert.match(source, /process\.env\.VERCEL_ENV === 'preview'/)
  assert.match(source, /isEntitlementEnforcementPreviewBranch\(process\.env\.VERCEL_GIT_COMMIT_REF\)/)
  assert.match(source, /process\.env\.AIRTABLE_BASE_ID === SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID/)
  assert.match(source, /\{Preview Only\} = TRUE\(\)/)
  assert.match(source, /maxRecords: '2'/)
  assert.match(source, /Duplicate Preview entitlement source records/)
})

test('internal pilot precedes ordinary Preview commercial records after the isolated Founder canary check', async () => {
  const source = await readFile(
    new URL('../lib/entitlement-context.ts', import.meta.url),
    'utf8',
  )
  const pilotBranch = source.indexOf('if (hasPilotAccess)')
  const previewLookup = source.indexOf('let previewSource = await getPreviewEntitlementSourceRecord(subjectId)')
  assert.ok(pilotBranch >= 0)
  assert.ok(previewLookup >= 0)
  assert.ok(pilotBranch < previewLookup)
})

test('clinic entitlement lifecycle authority requires authenticated patient binding match', async () => {
  const source = await readFile(
    new URL('../lib/entitlement-context.ts', import.meta.url),
    'utf8',
  )
  assert.match(source, /sourcePatientRecordId !== authenticatedPatientRecordId/)
  assert.match(source, /lastCompletedVisit: null/)
  assert.match(source, /getLinkedClinicConsultationsByPatientId\(authenticatedPatientRecordId\)/)
  assert.match(source, /lastCompletedVisitFromConsultations\(consultations\)/)
})
