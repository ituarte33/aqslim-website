'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { FinanceRecord } from '@/lib/airtable'
import { businessDate } from '@/lib/business-time'
import { buildDashboardReport, dashboardReportCsv } from '@/lib/dashboard-reports'
import { DashboardShell } from '../dashboard-shell'

export function ReportsClient({ user, records, loadError }: {
  user: { firstName: string | null; lastName: string | null } | null
  records: FinanceRecord[]
  loadError: boolean
}) {
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const es = lang === 'es'
  const [start, setStart] = useState(() => businessDate().slice(0, 7) + '-01')
  const [end, setEnd] = useState(() => businessDate())
  const invalid = !start || !end || start > end
  const report = useMemo(() => buildDashboardReport(records, start, end), [records, start, end])
  const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
  function download() {
    const url = URL.createObjectURL(new Blob([dashboardReportCsv(report)], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url; link.download = `AQSLIM-${start}-${end}.csv`; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <DashboardShell user={user} lang={lang} setLang={setLang}>
    <h1>{es ? 'Reportes de operación' : 'Operational reports'}</h1>
    <p>{es ? 'Consultas e ingresos registrados en AQSLIM. Los pagos de Square se comparan por separado en Finanzas.' : 'Visits and revenue recorded in AQSLIM. Compare Square payments separately in Finances.'}</p>
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'end', margin: '24px 0' }}>
      <label>{es ? 'Desde' : 'From'} <input aria-label={es ? 'Desde' : 'From'} type="date" value={start} onChange={event => setStart(event.target.value)} /></label>
      <label>{es ? 'Hasta' : 'To'} <input aria-label={es ? 'Hasta' : 'To'} type="date" value={end} onChange={event => setEnd(event.target.value)} /></label>
      <button type="button" onClick={download} disabled={invalid || loadError}>{es ? 'Descargar CSV' : 'Download CSV'}</button>
      <Link href="/dashboard/pilot-feedback">{es ? 'Comentarios de My AQSLIM →' : 'My AQSLIM feedback →'}</Link>
    </div>
    {loadError ? <p role="alert">{es ? 'No se pudieron cargar los registros. Recarga la página antes de usar este reporte.' : 'Records could not be loaded. Reload before using this report.'}</p>
      : invalid ? <p role="alert">{es ? 'Selecciona un rango de fechas válido.' : 'Select a valid date range.'}</p> : <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, padding: 24, border: '1px solid #6d5b2b' }}>
        <span>{es ? 'Consultas' : 'Visits'}: <strong>{report.totals.visitCount}</strong></span>
        <span>{es ? 'Pacientes únicos' : 'Unique patients'}: <strong>{report.totals.uniquePatients}</strong></span>
        <span>{es ? 'Nuevos' : 'New'}: <strong>{report.totals.newVisitCount}</strong></span>
        <span>{es ? 'Reinicios' : 'Restarts'}: <strong>{report.totals.restartVisitCount}</strong></span>
        <span>{es ? 'Ingresos registrados' : 'Recorded revenue'}: <strong>{money(report.totals.totalRevenue)}</strong></span>
      </div>
      {report.days.length === 0 ? <p>{es ? 'Sin registros en este período.' : 'No records in this period.'}</p> : <div style={{ overflowX: 'auto', marginTop: 24 }}><table style={{ width: '100%', textAlign: 'left', borderSpacing: '12px' }}>
        <thead><tr>{(es ? ['Fecha', 'Consultas', 'Pacientes del día', 'Consulta', 'Suplementos', 'Envío', 'Total'] : ['Date', 'Visits', 'Daily patients', 'Consultations', 'Supplements', 'Shipping', 'Total']).map(text => <th key={text}>{text}</th>)}</tr></thead>
        <tbody>{report.days.map(day => <tr key={day.date}><td>{day.date}</td><td>{day.visitCount}</td><td>{day.uniquePatients}</td><td>{money(day.consultationRevenue)}</td><td>{money(day.supplementRevenue)}</td><td>{money(day.shippingRevenue)}</td><td>{money(day.totalRevenue)}</td></tr>)}</tbody>
      </table></div>}
    </>}
  </DashboardShell>
}
