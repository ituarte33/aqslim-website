import 'server-only'

import type { PatientPortalData } from '@/lib/patient-portal'

export const demoPatientPortalData: PatientPortalData = {
  clienteId: 'demo-patient',
  firstName: 'María',
  fullName: 'María Ejemplo',
  language: 'es',
  unit: 'lb',
  planName: 'Jing',
  calorieTarget: null,
  phase: 'Jing',
  weekInPhase: 2,
  phaseStartDate: '2026-07-21T12:00:00.000Z',
  estimatedPhaseChange: '2026-08-25T17:00:00.000Z',
  nextPhase: 'Qi',
  specialInstructions: 'Continúa con la guía de tu fase actual y lleva tus preguntas a tu próxima revisión.',
  nextReview: '2026-08-18T17:00:00.000Z',
  measurements: [
    { id: 'demo-1', date: '2026-07-07T17:00:00.000Z', weight: 198, source: 'AQSLIM (Consulta)' },
    { id: 'demo-2', date: '2026-07-14T17:00:00.000Z', weight: 194.5, source: 'AQSLIM (Consulta)' },
    { id: 'demo-3', date: '2026-07-21T17:00:00.000Z', weight: 191.2, source: 'AQSLIM (Consulta)' },
    { id: 'demo-4', date: '2026-07-28T17:00:00.000Z', weight: 188.7, source: 'AQSLIM (Consulta)' },
    { id: 'demo-5', date: '2026-08-04T17:00:00.000Z', weight: 186.1, source: 'AQSLIM (Consulta)' },
    { id: 'demo-6', date: '2026-08-11T17:00:00.000Z', weight: 184, source: 'AQSLIM (Consulta)' },
  ],
  initialWeight: 198,
  currentWeight: 184,
  totalChange: -14,
  percentChange: 7.0707070707,
  goalWeight: 165,
  goalProgress: 42.4242424242,
}
