import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('Preview entitlement store is hard-scoped to P3 Preview and the approved Airtable base', async () => {
  const source = await readFile(
    new URL('../lib/preview-entitlement-store.ts', import.meta.url),
    'utf8',
  )
  assert.match(source, /process\.env\.VERCEL_ENV === 'preview'/)
  assert.match(source, /process\.env\.VERCEL_GIT_COMMIT_REF === ENTITLEMENT_P3_PREVIEW_BRANCH/)
  assert.match(source, /process\.env\.AIRTABLE_BASE_ID === SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID/)
  assert.match(source, /\{Preview Only\} = TRUE\(\)/)
  assert.match(source, /maxRecords: '2'/)
  assert.match(source, /Duplicate Preview entitlement source records/)
})

test('internal pilot has precedence over Preview commercial entitlement records', async () => {
  const source = await readFile(
    new URL('../lib/entitlement-context.ts', import.meta.url),
    'utf8',
  )
  const pilotBranch = source.indexOf('if (hasPilotAccess)')
  const previewLookup = source.indexOf('getPreviewEntitlementSourceRecord(subjectId)')
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
  assert.match(source, /getConsultasByPatientId\(authenticatedPatientRecordId, patientName\)/)
  assert.match(source, /lastCompletedVisitFromConsultations\(consultations\)/)
})
