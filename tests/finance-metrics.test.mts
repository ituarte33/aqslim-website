import assert from 'node:assert/strict'
import test from 'node:test'

import { getFinanceMetrics, getGrowthMetrics, isPatientVisit, parseSalesNotes } from '../lib/finance-metrics.ts'

test('parses current supplement subtotal and shipping independently', () => {
  const parsed = parseSalesNotes([
    'Suplementos vendidos:',
    '- AQ Female Support ($35.00)',
    '- Premium Psyllium Husk ($20.00)',
    'Subtotal: $55.00',
    'Envío (Chico): $8.00',
  ].join('\n'))

  assert.equal(parsed.supplementTotal, 55)
  assert.equal(parsed.shippingTotal, 8)
  assert.equal(parsed.items.length, 2)
})

test('keeps compatibility with legacy Total notes', () => {
  const parsed = parseSalesNotes('Suplementos vendidos:\n- Producto ($25.00)\nTotal: $25.00')
  assert.equal(parsed.supplementTotal, 25)
  assert.equal(parsed.shippingTotal, 0)
})

test('counts visits and unique patients without counting supplement-only sales', () => {
  const records = [
    { date: '2026-08-03', tipoConsulta: 'Cliente subsecuente', montoCobrado: 30, suppTotal: 0, shippingTotal: 0, paciente: 'Ana' },
    { date: '2026-08-10', tipoConsulta: 'Cliente subsecuente', montoCobrado: 65, suppTotal: 35, shippingTotal: 0, paciente: 'Ana' },
    { date: '2026-08-11', tipoConsulta: 'Cliente Nuevo', montoCobrado: 40, suppTotal: 0, shippingTotal: 0, paciente: 'Luis' },
    { date: '2026-08-12', tipoConsulta: 'Suplementos + Envio', montoCobrado: 48, suppTotal: 40, shippingTotal: 8, paciente: 'Luis' },
  ]

  const metrics = getFinanceMetrics(records)
  assert.equal(metrics.visitCount, 3)
  assert.equal(metrics.uniquePatients, 2)
  assert.equal(metrics.newVisitCount, 1)
  assert.equal(metrics.subsequentVisitCount, 2)
  assert.equal(metrics.restartVisitCount, 0)
  assert.equal(metrics.consultationRevenue, 100)
  assert.equal(metrics.supplementRevenue, 75)
  assert.equal(metrics.shippingRevenue, 8)
  assert.equal(metrics.totalRevenue, 183)
  assert.equal(isPatientVisit(records[3]), false)
})

test('separates acquisition sources and ranks advertising channels', () => {
  const records = [
    { date: '2026-08-01', tipoConsulta: 'Cliente Nuevo', montoCobrado: 40, suppTotal: 0, shippingTotal: 0, paciente: 'Ana', acquisitionSource: 'Referido' },
    { date: '2026-08-02', tipoConsulta: 'Cliente Nuevo', montoCobrado: 40, suppTotal: 0, shippingTotal: 0, paciente: 'Luis', acquisitionSource: 'Redes Sociales', advertisingChannel: 'Instagram', acquisitionOwner: 'Hillary' },
    { date: '2026-08-03', tipoConsulta: 'Cliente Nuevo', montoCobrado: 40, suppTotal: 0, shippingTotal: 0, paciente: 'Marta', acquisitionSource: 'Anuncio', advertisingChannel: 'Instagram' },
    { date: '2026-08-04', tipoConsulta: 'Cliente Re-Inicio', montoCobrado: 30, suppTotal: 0, shippingTotal: 0, paciente: 'Eva', reactivationOwner: 'Hillary' },
    { date: '2026-08-05', tipoConsulta: 'Cliente Nuevo', montoCobrado: 40, suppTotal: 0, shippingTotal: 0, paciente: 'José' },
    { date: '2026-08-06', tipoConsulta: 'Cliente subsecuente', montoCobrado: 30, suppTotal: 0, shippingTotal: 0, paciente: 'Luis', acquisitionOwner: 'Hillary' },
  ]

  const growth = getGrowthMetrics(records)
  assert.equal(growth.newPatients, 4)
  assert.equal(growth.referred, 1)
  assert.equal(growth.advertising, 2)
  assert.equal(growth.hillary, 2)
  assert.equal(growth.hillaryNewPatients, 1)
  assert.equal(growth.hillaryRestarts, 1)
  assert.equal(growth.attributionRecorded, 2)
  assert.equal(growth.missingOwner, 3)
  assert.equal(growth.unclassified, 1)
  assert.deepEqual(growth.bestAdvertisingChannel, { channel: 'Instagram', count: 2 })
})
