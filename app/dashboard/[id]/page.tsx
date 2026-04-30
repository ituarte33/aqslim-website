import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { getClienteById, getConsultasByCliente, type Cliente, type Consulta } from '@/lib/airtable'
import { getRole, getUserEmail } from '@/lib/auth'
import { PatientDetailClient } from './patient-detail-client'

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { id } = await params
  const role = await getRole()

  let patient: Cliente | null = null
  let consultations: Consulta[] = []
  let error: string | null = null

  try {
    patient = await getClienteById(id)

    // Patients can only view their own record
    if (role === 'patient') {
      const email = await getUserEmail()
      if (!email || patient.fields['Email'] !== email) notFound()
    }

    const idCliente = patient.fields['ID Cliente']
    if (typeof idCliente === 'number') {
      consultations = await getConsultasByCliente(idCliente)
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
  }

  return (
    <PatientDetailClient
      patient={patient}
      consultations={consultations}
      error={error}
      isAdmin={role === 'admin'}
    />
  )
}
