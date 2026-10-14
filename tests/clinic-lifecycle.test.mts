import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveClinicLifecycle } from '../lib/clinic-lifecycle.ts'
import {
  isQualifyingClinicVisitType,
  lastCompletedVisitFromConsultations,
} from '../lib/clinic-visit-policy.ts'

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

test('D11 allows only qualifying clinical consultation types to reset lifecycle', () => {
  assert.equal(isQualifyingClinicVisitType('Cliente Nuevo'), true)
  assert.equal(isQualifyingClinicVisitType('Cliente subsecuente'), true)
  assert.equal(isQualifyingClinicVisitType('Cliente Re-Inicio'), true)
  assert.equal(isQualifyingClinicVisitType('Suplementos'), false)
  assert.equal(isQualifyingClinicVisitType('Suplementos + Envio'), false)
})

test('Last Completed Visit ignores supplement-only records and uses latest qualifying visit', () => {
  assert.equal(lastCompletedVisitFromConsultations([
    { fields: { 'Fecha Consulta': '2026-07-01', 'Tipo de Consulta': 'Cliente Nuevo' } },
    { fields: { 'Fecha Consulta': '2026-09-09', 'Tipo de Consulta': 'Suplementos' } },
    { fields: { 'Fecha Consulta': '2026-08-12', 'Tipo de Consulta': 'Cliente subsecuente' } },
    { fields: { 'Fecha Consulta': '2026-09-03', 'Tipo de Consulta': 'Cliente Re-Inicio' } },
    { fields: { 'Fecha Consulta': '2026-09-10', 'Tipo de Consulta': 'Suplementos + Envio' } },
    { fields: { 'Fecha Consulta': 'invalid', 'Tipo de Consulta': 'Cliente Nuevo' } },
  ]), '2026-09-03')

  assert.equal(lastCompletedVisitFromConsultations([
    { fields: { 'Fecha Consulta': '2026-09-09', 'Tipo de Consulta': 'Suplementos' } },
    { fields: { 'Fecha Consulta': '2026-09-10', 'Tipo de Consulta': 'Suplementos + Envio' } },
  ]), null)
  assert.equal(lastCompletedVisitFromConsultations([]), null)
})
