import assert from 'node:assert/strict'
import test from 'node:test'
import { clinicPortalWeight, CLINIC_PORTAL_WEIGHT_FIELDS as F } from '../lib/clinic-portal-weight.ts'
import { isClinicPreviewEnvironment } from '../lib/clinic-preview-policy.ts'
const patient = 'recRdlkniEv0MB4gT'
const record = { id: 'rec12345678901234', fields: {
  [F.patientId]: patient, [F.patient]: [patient], [F.preview]: true,
  [F.type]: 'Actualización de peso', [F.date]: '2026-10-24', [F.weight]: 222, [F.unit]: 'lb',
} }
test('maps a reported weight without turning it into a consultation or FAST36 record', () => {
  assert.deepEqual(clinicPortalWeight(record, patient, 'lb'), {
    id: `clinic-preview:${record.id}`, date: '2026-10-24', calendarDate: true,
    weight: 222, source: 'AQSLIM (Peso reportado · Preview)',
  })
})
test('requires both matching patient identity and patient link, and preview marker', () => {
  for (const patch of [{[F.patientId]: 'rec12345678901234'}, {[F.patient]: []}, {[F.preview]: false}]) {
    assert.equal(clinicPortalWeight({...record, fields: {...record.fields, ...patch}}, patient, 'lb'), null)
  }
})
test('excludes consultations, missing dates, impossible dates, unsupported units and invalid weights', () => {
  for (const patch of [{[F.type]: 'Subsecuente'}, {[F.date]: ''}, {[F.date]: '2026-02-30'}, {[F.unit]: 'stone'}, {[F.weight]: 0}]) {
    assert.equal(clinicPortalWeight({...record, fields: {...record.fields, ...patch}}, patient, 'lb'), null)
  }
})
test('converts units without rounding the stored patient report', () => {
  assert.ok(Math.abs(clinicPortalWeight(record, patient, 'kg')!.weight - 100.6975) < .001)
  const kg = {...record, fields: {...record.fields, [F.weight]: 100, [F.unit]: 'kg'}}
  assert.ok(Math.abs(clinicPortalWeight(kg, patient, 'lb')!.weight - 220.46226) < .001)
})
test('read gate rejects production and other preview branches', () => {
  assert.equal(isClinicPreviewEnvironment({VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_REF: 'myaq-clinic-functional-v1'}), false)
  assert.equal(isClinicPreviewEnvironment({VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'main'}), false)
  assert.equal(isClinicPreviewEnvironment({VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'myaq-clinic-functional-v1'}), true)
})
