import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDashboardReport, dashboardReportCsv } from '../lib/dashboard-reports.ts'

test('operational report separates supplement sales from visits and exports only aggregates', () => {
  const record = { date: '2026-11-10', tipoConsulta: 'Cliente subsecuente', montoCobrado: 65, suppTotal: 35, shippingTotal: 0, paciente: 'PRIVATE PATIENT', patientKey: 'recPrivate' }
  const report = buildDashboardReport([record, { ...record, tipoConsulta: 'Suplementos', montoCobrado: 20, suppTotal: 20 }, { ...record, date: '2026-10-01' }], '2026-11-01', '2026-11-10')
  assert.equal(report.totals.totalRevenue, 85)
  assert.equal(report.totals.visitCount, 1)
  assert.equal(report.totals.uniquePatients, 1)
  assert.equal(report.days[0].consultationRevenue, 30)
  const csv = dashboardReportCsv(report)
  assert.ok(csv.includes('85.00'))
  assert.ok(!csv.includes('PRIVATE'))
  assert.ok(!csv.includes('recPrivate'))
  assert.deepEqual(buildDashboardReport([], '2026-11-01', '2026-11-10').days, [])
})
