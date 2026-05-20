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
import { getRole, getUserEmail } from '@/lib/auth'
import { PatientDetailClient } from './patient-detail-client'

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { id } = await params
  const role = await getRole()

  let patient: Cliente | null = null
  let consultations: Consulta[] = []
  let cuestionarios: CuestionarioSintoma[] = []
  let error: string | null = null

  try {
    patient = await getClienteById(id)

    if (role === 'patient') {
      const email = await getUserEmail()
      if (!email || patient.fields['Email'] !== email) notFound()
    }

    const nombreCliente = patient.fields['Nombre Completo'] ?? ''
    if (nombreCliente) {
      ;[consultations, cuestionarios] = await Promise.all([
        getConsultasByCliente(nombreCliente),
        getCuestionariosByCliente(nombreCliente),
      ])
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
  }

  return (
    <PatientDetailClient
      patient={patient}
      consultations={consultations}
      cuestionarios={cuestionarios}
      error={error}
      isAdmin={role === 'admin'}
    />
  )
}
