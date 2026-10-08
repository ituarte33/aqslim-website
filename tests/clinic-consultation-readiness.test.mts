import assert from 'node:assert/strict'
import test from 'node:test'
import { assessClinicConsultationReadiness } from '../lib/clinic-consultation-readiness.ts'

test('accepts a linked patient, valid date, and non-negative payment amounts', () => {
  const result = assessClinicConsultationReadiness({
    patientId: 'recSyntheticPatient',
    consultationDate: '2026-10-07',
    consultationFee: '30',
    amountCollected: '30',
  })

  assert.equal(result.ready, true)
  assert.equal(result.checks.every(check => check.passed), true)
})

test('allows optional payment amounts to remain empty', () => {
  const result = assessClinicConsultationReadiness({
    patientId: 'recSyntheticPatient',
    consultationDate: '2026-10-07',
    consultationFee: '',
    amountCollected: '',
  })

  assert.equal(result.ready, true)
})

test('blocks missing identity, invalid dates, negative charges, and non-numeric collections', () => {
  const result = assessClinicConsultationReadiness({
    patientId: null,
    consultationDate: '2026-02-31',
    consultationFee: '-1',
    amountCollected: 'thirty',
  })

  assert.equal(result.ready, false)
  assert.deepEqual(result.checks.filter(check => !check.passed).map(check => check.key), ['patient', 'date', 'charge', 'collected'])
})
