import { redirect } from 'next/navigation'
import { getFast36SessionsByPatient } from '@/lib/airtable'
import { requireOwnPatient } from '@/lib/auth'
import { normalizeFast36Status, type Fast36Session } from '@/lib/fast36-policy'
import { Fast36View } from './fast36-view'

export const metadata = {
  title: 'FAST 36 — MY AQSLIM',
  description: 'Seguimiento personal del protocolo AQSLIM FAST 36',
}

export default async function Fast36Page() {
  const patient = await requireOwnPatient('fasting:read:self')
  const records = await getFast36SessionsByPatient(patient.id)
  if (!records.length) redirect('/my-aqslim/pilot')

  const sessions: Fast36Session[] = records.flatMap(record => {
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
    <Fast36View
      firstName={patient.fields['Nombre Completo']?.trim().split(/\s+/)[0] || 'Paciente'}
      sessions={sessions}
    />
  )
}
