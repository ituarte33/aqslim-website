import { redirect } from 'next/navigation'
import { getActor } from '@/lib/auth'
import { getClientes } from '@/lib/airtable'
import { isClinicFounderIdentity, isClinicPreviewEnvironment } from '@/lib/clinic-preview-policy'
import { ClinicPreviewClient } from './clinic-preview-client'

function clinicEnvironment() {
  return {
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
  }
}

export default async function ClinicPreviewPage() {
  const environment = clinicEnvironment()
  if (!isClinicPreviewEnvironment(environment)) redirect('/my-aqslim')

  const actor = await getActor()
  if (!actor) redirect('/sign-in')
  if (!isClinicFounderIdentity({ email: actor.email, environment })) redirect('/my-aqslim')

  const patients = await getClientes()
  const items = patients
    .map(patient => ({
      id: patient.id,
      name: String(patient.fields['Nombre Completo'] ?? 'Sin nombre'),
      email: String(patient.fields['Email'] ?? ''),
      phone: String(patient.fields['Teléfono'] ?? ''),
      status: String(patient.fields['Estado del Cliente'] ?? ''),
      language: String(patient.fields['Idioma Preferido'] ?? ''),
      nextAppointment: String(patient.fields['Próxima Cita'] ?? ''),
      goal: String(patient.fields['Meta del Cliente'] ?? ''),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))

  return <ClinicPreviewClient patients={items} />
}
