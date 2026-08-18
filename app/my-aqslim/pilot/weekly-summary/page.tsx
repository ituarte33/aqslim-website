import { redirect } from 'next/navigation'
import { getFast36SessionsByPatient, getMealLogsBetween } from '@/lib/airtable'
import { getPatientPortalData } from '@/lib/patient-portal'
import { getPilotAccess } from '@/lib/pilot-access'
import { normalizeFast36Status, type Fast36Session } from '@/lib/fast36-policy'
import { buildWeeklySummary, weeklySummaryPeriod } from '@/lib/weekly-summary'
import { WeeklySummaryView } from './weekly-summary-view'

export const metadata = {
  title: 'Resumen semanal — MY AQSLIM',
  description: 'Resumen objetivo de los registros semanales en MY AQSLIM',
}

export default async function WeeklySummaryPage() {
  const [pilot, patient] = await Promise.all([
    getPilotAccess(),
    getPatientPortalData(),
  ])
  if (!pilot) redirect('/my-aqslim')
  if (!patient) redirect('/my-aqslim/pilot')

  const period = weeklySummaryPeriod()
  const [mealLogs, fast36Records] = await Promise.all([
    getMealLogsBetween(pilot.clerkUserId, period.startUtc, period.endUtc).catch(() => []),
    getFast36SessionsByPatient(patient.clienteId).catch(() => []),
  ])
  const fast36Sessions: Fast36Session[] = fast36Records.flatMap(record => {
    const week = record.fields['Semana']
    const startAt = record.fields['Inicio']
    const plannedEndAt = record.fields['Fin programado']
    if (typeof week !== 'number' || !startAt || !plannedEndAt) return []
    return [{
      id: record.id,
      week,
      startAt,
      plannedEndAt,
      actualEndAt: record.fields['Fin real'] ?? null,
      status: normalizeFast36Status(record.fields['Estado']),
    }]
  })

  return (
    <WeeklySummaryView
      firstName={patient.firstName}
      phase={patient.phase}
      initialLanguage={patient.language ?? pilot.language}
      summary={buildWeeklySummary(mealLogs, fast36Sessions)}
    />
  )
}
