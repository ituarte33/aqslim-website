import 'server-only'

import { cache } from 'react'
import {
  getConsultasByPatientId,
  getPlanById,
  type Consulta,
} from '@/lib/airtable'
import { AuthorizationError, getOwnPatient, requireCapability } from '@/lib/auth'
import { toCanonicalPhaseName } from '@/lib/phase-names'

export type PortalMeasurement = {
  id: string
  date: string
  weight: number
  source: 'AQSLIM (Consulta)'
}

export type PatientPortalData = {
  clienteId: string
  firstName: string
  fullName: string
  language: 'es' | 'en'
  unit: 'lb' | 'kg'
  phase: string | null
  weekInPhase: number | null
  phaseStartDate: string | null
  estimatedPhaseChange: string | null
  nextPhase: string | null
  specialInstructions: string | null
  nextReview: string | null
  measurements: PortalMeasurement[]
  initialWeight: number | null
  currentWeight: number | null
  totalChange: number | null
  percentChange: number | null
  goalWeight: number | null
  goalProgress: number | null
}

function asString(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return null
}

function toDisplayWeight(kg: number, unit: 'lb' | 'kg') {
  return unit === 'lb' ? kg * 2.2046226218 : kg
}

function measurementFromConsulta(
  consulta: Consulta,
  unit: 'lb' | 'kg',
): PortalMeasurement | null {
  const kg = consulta.fields['Peso (kg)']
  const date = consulta.fields['Fecha Consulta']
  if (typeof kg !== 'number' || !date) return null
  return {
    id: consulta.id,
    date,
    weight: toDisplayWeight(kg, unit),
    source: 'AQSLIM (Consulta)',
  }
}

export const getPatientPortalData = cache(async (): Promise<PatientPortalData | null> => {
  await requireCapability('portal:read:self')
  let cliente
  try {
    cliente = await getOwnPatient()
  } catch (error) {
    if (error instanceof AuthorizationError && error.code === 'PATIENT_NOT_FOUND') return null
    throw error
  }

  const clienteName = cliente.fields['Nombre Completo']?.trim()
  const planId = cliente.fields['Plan AQSLIM']?.[0]
  const [consultas, plan] = await Promise.all([
    clienteName
      ? getConsultasByPatientId(cliente.id, clienteName).catch(() => [] as Consulta[])
      : Promise.resolve([] as Consulta[]),
    planId ? getPlanById(planId).catch(() => null) : Promise.resolve(null),
  ])

  const unitField = String(cliente.fields['Unidad de Peso'] ?? '').toLowerCase()
  const unit: 'lb' | 'kg' = unitField.includes('kg') ? 'kg' : 'lb'
  const measurements = consultas
    .map(consulta => measurementFromConsulta(consulta, unit))
    .filter((measurement): measurement is PortalMeasurement => Boolean(measurement))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))

  const first = measurements[0] ?? null
  const latest = measurements.at(-1) ?? null
  const initialWeight = first?.weight ?? null
  const currentWeight = latest?.weight ?? null
  const totalChange = initialWeight !== null && currentWeight !== null
    ? currentWeight - initialWeight
    : null
  const percentChange = initialWeight && totalChange !== null
    ? Math.abs(totalChange / initialWeight) * 100
    : null

  const clientGoal = cliente.fields['Peso Meta']
  const planGoalKg = plan?.fields['Peso Meta (kg)']
  const goalWeight = typeof clientGoal === 'number'
    ? clientGoal
    : typeof planGoalKg === 'number'
      ? toDisplayWeight(planGoalKg, unit)
      : null
  const goalProgress = initialWeight !== null && currentWeight !== null && goalWeight !== null && initialWeight !== goalWeight
    ? Math.max(0, Math.min(100, ((initialWeight - currentWeight) / (initialWeight - goalWeight)) * 100))
    : null

  const latestConsulta = consultas[0]
  const fullName = cliente.fields['Nombre Completo']?.trim() || 'Paciente AQSLIM'
  const preferredLanguage = String(cliente.fields['Idioma Preferido'] ?? '').toLowerCase()

  return {
    clienteId: cliente.id,
    firstName: fullName.split(/\s+/)[0] || fullName,
    fullName,
    language: preferredLanguage.includes('english') || preferredLanguage.includes('ingl') ? 'en' : 'es',
    unit,
    phase: toCanonicalPhaseName(
      plan?.fields['Fase Actual']
        ?? asString(latestConsulta?.fields['Fase de Dieta Actual']),
    ),
    weekInPhase: plan?.fields['Semana en Fase Actual']
      ?? (typeof latestConsulta?.fields['Semana en Fase Actual'] === 'number'
        ? latestConsulta.fields['Semana en Fase Actual']
        : null),
    phaseStartDate: plan?.fields['Fecha Inicio Fase Actual'] ?? null,
    estimatedPhaseChange: plan?.fields['Fecha Estimada Cambio de Fase'] ?? null,
    nextPhase: toCanonicalPhaseName(asString(plan?.fields['Siguiente Fase'])),
    specialInstructions: plan?.fields['Instrucciones Especiales']?.trim() || null,
    nextReview: cliente.fields['Próxima Cita']
      ?? latestConsulta?.fields['Próxima Cita']
      ?? null,
    measurements,
    initialWeight,
    currentWeight,
    totalChange,
    percentChange,
    goalWeight,
    goalProgress,
  }
})
