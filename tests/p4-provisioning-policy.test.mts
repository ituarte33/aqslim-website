import assert from 'node:assert/strict'
import test from 'node:test'
import { createCanonicalEntitlementRecord } from '../lib/entitlement-record.ts'
import {
  pendingPatientSubjectId,
  provisioningPlanForClinicVisit,
} from '../lib/p4-provisioning-policy.ts'

const visitDate = new Date('2026-09-11T00:00:00.000Z')

function existing(overrides: Partial<ReturnType<typeof createCanonicalEntitlementRecord>> = {}) {
  return createCanonicalEntitlementRecord({
    subjectId: 'patient:recABCDEFGHIJKLMN',
    tier: 'portal_basic',
    status: 'active',
    source: 'clinic_visit',
    trialStarts: null,
    trialEnds: null,
    paidThrough: null,
    lastCompletedVisit: '2026-09-01',
    graceEnds: '2026-10-31',
    accessExpires: null,
    squareSubscriptionId: null,
    entitlementReason: 'test',
    lastAccessChange: '2026-09-01T00:00:00.000Z',
    override: null,
    overrideReason: null,
    ...overrides,
  })
}

test('Cliente Nuevo and Cliente Re-Inicio start or renew a 30-day clinic_ai trial', () => {
  for (const visitType of ['Cliente Nuevo', 'Cliente Re-Inicio']) {
    const plan = provisioningPlanForClinicVisit({
      visitType,
      completedAt: visitDate,
      existingRecord: null,
    })
    assert.equal(plan.action, 'start_or_renew_trial')
    assert.equal(plan.trialStarts, '2026-09-11T00:00:00.000Z')
    assert.equal(plan.trialEnds, '2026-10-11T00:00:00.000Z')
  }

  const renewal = provisioningPlanForClinicVisit({
    visitType: 'Cliente Re-Inicio',
    completedAt: visitDate,
    existingRecord: existing({ tier: 'clinic_ai', status: 'expired', source: 'clinic_ai_trial' }),
  })
  assert.equal(renewal.action, 'start_or_renew_trial')
})

test('Cliente subsecuente creates Portal Basic only when no clinical entitlement exists', () => {
  assert.equal(provisioningPlanForClinicVisit({
    visitType: 'Cliente subsecuente',
    completedAt: visitDate,
    existingRecord: null,
  }).action, 'create_portal_basic')

  const existingTrial = existing({
    tier: 'clinic_ai',
    status: 'trial',
    source: 'clinic_ai_trial',
    trialStarts: '2026-09-01T00:00:00.000Z',
    trialEnds: '2026-10-01T00:00:00.000Z',
  })
  const refresh = provisioningPlanForClinicVisit({
    visitType: 'Cliente subsecuente',
    completedAt: visitDate,
    existingRecord: existingTrial,
  })
  assert.equal(refresh.action, 'refresh_existing')
  assert.equal(refresh.trialStarts, existingTrial.trialStarts)
  assert.equal(refresh.trialEnds, existingTrial.trialEnds)
})

test('supplement-only visits never provision or refresh entitlement', () => {
  for (const visitType of ['Suplementos', 'Suplementos + Envio']) {
    const plan = provisioningPlanForClinicVisit({
      visitType,
      completedAt: visitDate,
      existingRecord: null,
    })
    assert.equal(plan.action, 'none')
  }
})

test('internal pilot, Kenkho, paid clinic_ai, and administrative entitlements are protected', () => {
  const protectedRecords = [
    existing({ tier: 'internal_pilot', source: 'internal_pilot' }),
    existing({ tier: 'kenkho_start', source: 'kenkho_path' }),
    existing({ tier: 'kenkho_plus', source: 'kenkho_path' }),
    existing({ tier: 'kenkho_elite', source: 'kenkho_path' }),
    existing({ tier: 'clinic_ai', status: 'active', source: 'clinic_ai_paid', paidThrough: '2026-10-31' }),
    existing({ tier: 'clinic_ai', status: 'active', source: 'administrative' }),
  ]

  for (const record of protectedRecords) {
    const plan = provisioningPlanForClinicVisit({
      visitType: 'Cliente Re-Inicio',
      completedAt: visitDate,
      existingRecord: record,
    })
    assert.equal(plan.action, 'preserve_protected')
  }
})

test('pending patient subject IDs use stable Airtable record IDs only', () => {
  assert.equal(pendingPatientSubjectId('recABCDEFGHIJKLMN'), 'patient:recABCDEFGHIJKLMN')
  assert.throws(() => pendingPatientSubjectId('not-a-record'))
})
