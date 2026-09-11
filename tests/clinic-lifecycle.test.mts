import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveClinicLifecycle } from '../lib/clinic-lifecycle.ts'
import { lastCompletedVisitFromConsultations } from '../lib/clinic-visit-policy.ts'

test('clinic lifecycle uses approved 0-30 / 31-60 / 61+ boundaries', () => {
  assert.deepEqual(resolveClinicLifecycle('2026-08-12', '2026-09-11'), {
    lifecycle: 'ACTIVE',
    daysSinceLastCompletedVisit: 30,
    restartEligible: false,
  })
  assert.deepEqual(resolveClinicLifecycle('2026-08-11', '2026-09-11'), {
    lifecycle: 'GRACE',
    daysSinceLastCompletedVisit: 31,
    restartEligible: false,
  })
  assert.deepEqual(resolveClinicLifecycle('2026-07-13', '2026-09-11'), {
    lifecycle: 'GRACE',
    daysSinceLastCompletedVisit: 60,
    restartEligible: false,
  })
  assert.deepEqual(resolveClinicLifecycle('2026-07-12', '2026-09-11'), {
    lifecycle: 'INACTIVE',
    daysSinceLastCompletedVisit: 61,
    restartEligible: true,
  })
})

test('missing, invalid, or future visit evidence fails closed as unresolved', () => {
  assert.equal(resolveClinicLifecycle(null, '2026-09-11').lifecycle, 'UNRESOLVED')
  assert.equal(resolveClinicLifecycle('not-a-date', '2026-09-11').lifecycle, 'UNRESOLVED')
  assert.equal(resolveClinicLifecycle('2026-09-12', '2026-09-11').lifecycle, 'UNRESOLVED')
})

test('Last Completed Visit is the latest valid recorded consultation date', () => {
  assert.equal(lastCompletedVisitFromConsultations([
    { fields: { 'Fecha Consulta': '2026-07-01' } },
    { fields: { 'Fecha Consulta': '2026-09-03' } },
    { fields: { 'Fecha Consulta': '2026-08-12' } },
    { fields: { 'Fecha Consulta': 'invalid' } },
  ]), '2026-09-03')
  assert.equal(lastCompletedVisitFromConsultations([]), null)
})
