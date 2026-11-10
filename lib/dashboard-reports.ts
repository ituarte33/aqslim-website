import { normalizeClinicIsoDate } from './clinic-date'
import { getFinanceMetrics, type FinanceMetricRecord } from './finance-metrics'

export function buildDashboardReport(records: FinanceMetricRecord[], start: string, end: string) {
  const selected = records.filter(record => normalizeClinicIsoDate(record.date) !== null && record.date >= start && record.date <= end)
  const dates = [...new Set(selected.map(record => record.date))].sort()
  return {
    totals: getFinanceMetrics(selected),
    days: dates.map(date => ({ date, ...getFinanceMetrics(selected.filter(record => record.date === date)) })),
  }
}

// Aggregate amounts only: no patient names, emails, identifiers, or notes.
export function dashboardReportCsv(report: ReturnType<typeof buildDashboardReport>): string {
  const rows: (string | number)[][] = [
    ['Fecha', 'Consultas', 'Pacientes del día', 'Nuevos', 'Subsecuentes', 'Reinicios', 'Consultas USD', 'Suplementos USD', 'Envíos USD', 'Total USD'],
    ...report.days.map(day => [day.date, day.visitCount, day.uniquePatients, day.newVisitCount, day.subsequentVisitCount, day.restartVisitCount, day.consultationRevenue.toFixed(2), day.supplementRevenue.toFixed(2), day.shippingRevenue.toFixed(2), day.totalRevenue.toFixed(2)]),
  ]
  return '\uFEFF' + rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n')
}
