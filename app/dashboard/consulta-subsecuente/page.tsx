import { patientIsUnavailable } from '@/lib/clinic-patient-administration-policy'
import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getRole } from '@/lib/auth'
import {
  getClienteById,
  getClientes,
  getConsultasForPatient,
  getCuestionariosForPatient,
  getSupplementos,
  type Cliente,
  type Consulta,
  type CuestionarioSintoma,
  type Suplemento,
} from '@/lib/airtable'
import { ConsultaSubsecuenteClient } from './consulta-subsecuente-client'

export default async function ConsultaSubsecuentePage({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const role = await getRole()
  if (role !== 'admin') redirect('/dashboard')

  const user = await currentUser()
  const { clienteId } = await searchParams

  let patient: Cliente | null = null
  let allPatients: Cliente[] = []
  let supplementos: Suplemento[] = []
  let initialConsultations: Consulta[] = []
  let initialCuestionarios: CuestionarioSintoma[] = []

  if (clienteId) {
    try {
      patient = await getClienteById(clienteId)
      const nombre = patient.fields['Nombre Completo'] ?? ''
      const [consultasResult, cuestionariosResult, supplementosResult] = await Promise.allSettled([
        getConsultasForPatient(patient),
        getCuestionariosForPatient(patient),
        getSupplementos(),
      ])
      if (consultasResult.status === 'fulfilled') initialConsultations = consultasResult.value
      if (cuestionariosResult.status === 'fulfilled') initialCuestionarios = cuestionariosResult.value
      if (supplementosResult.status === 'fulfilled') supplementos = supplementosResult.value
    } catch { /* errors shown in client */ }
  } else {
    const [patientsResult, supplementosResult] = await Promise.allSettled([
      getClientes(),
      getSupplementos(),
    ])
    if (patientsResult.status === 'fulfilled') allPatients = (patientsResult.value as Cliente[]).filter(patient => !patientIsUnavailable(patient))
    if (supplementosResult.status === 'fulfilled') supplementos = supplementosResult.value
  }

  if (patient && patientIsUnavailable(patient)) redirect(`/dashboard/${patient.id}`)

  return (
    <ConsultaSubsecuenteClient
      user={user ? { firstName: user.firstName, lastName: user.lastName } : null}
      patient={patient}
      allPatients={allPatients}
      supplementos={supplementos}
      initialConsultations={initialConsultations}
      initialCuestionarios={initialCuestionarios}
    />
  )
}
