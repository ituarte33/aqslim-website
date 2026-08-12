import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import {
  getClienteById,
  getConsultasByCliente,
  getCuestionariosByCliente,
  type Cliente,
  type Consulta,
  type CuestionarioSintoma,
} from '@/lib/airtable'
import { requireActor, requireCapability, requirePatientOwnership } from '@/lib/auth'
import { PatientDetailClient } from './patient-detail-client'

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { id } = await params
  const actor = await requireActor()

  let patient: Cliente | null = null
  let consultations: Consulta[] = []
  let cuestionarios: CuestionarioSintoma[] = []
  let error: string | null = null

  try {
    if (actor.role === 'admin') {
      await requireCapability('patients:read:any')
      patient = await getClienteById(id)
    } else {
      patient = await requirePatientOwnership(id, 'portal:read:self')
    }

    const nombreCliente = patient.fields['Nombre Completo'] ?? ''
    if (nombreCliente) {
      ;[consultations, cuestionarios] = await Promise.all([
        getConsultasByCliente(nombreCliente),
        getCuestionariosByCliente(nombreCliente),
      ])
    }
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') notFound()
    error = e instanceof Error ? e.message : String(e)
  }

  return (
    <PatientDetailClient
      patient={patient}
      consultations={consultations}
      cuestionarios={cuestionarios}
      error={error}
      isAdmin={actor.role === 'admin'}
    />
  )
}
