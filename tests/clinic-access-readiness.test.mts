import assert from 'node:assert/strict'
import test from 'node:test'
import { getClinicAccessReadiness } from '../lib/clinic-access-readiness.ts'

test('marks a patient with stable record and valid email ready for review', () => {
  const result = getClinicAccessReadiness({
    patientId: 'recABCDEFGHIJKLMN',
    email: 'patient@example.com',
    phone: '',
    language: '',
  })

  assert.equal(result.readyForReview, true)
  assert.equal(result.accessState, 'not_provisioned')
  assert.equal(result.checks.find(check => check.key === 'phone')?.required, false)
})

test('keeps missing or invalid email as a readiness blocker', () => {
  const result = getClinicAccessReadiness({
    patientId: 'recABCDEFGHIJKLMN',
    email: 'not-an-email',
    phone: '6195550100',
    language: 'Español',
  })

  assert.equal(result.readyForReview, false)
  assert.deepEqual(result.blockers, ['Email válido para identidad'])
})

test('distinguishes pending and linked Preview access records', () => {
  const base = {
    patientId: 'recABCDEFGHIJKLMN',
    email: 'patient@example.com',
    phone: '6195550100',
    language: 'Español',
  }
  const pending = getClinicAccessReadiness({
    ...base,
    entitlement: { present: true, binding: 'pending', tier: 'portal_basic', status: 'active' },
  })
  const linked = getClinicAccessReadiness({
    ...base,
    entitlement: { present: true, binding: 'linked', tier: 'clinic_ai', status: 'trial' },
  })

  assert.equal(pending.accessState, 'pending_binding')
  assert.equal(linked.accessState, 'linked')
  assert.equal(linked.entitlement.tier, 'clinic_ai')
})
