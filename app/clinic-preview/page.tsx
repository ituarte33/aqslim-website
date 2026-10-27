import { patientAdministration } from '@/lib/clinic-patient-administration-policy'
import { redirect } from 'next/navigation'
import { getActor } from '@/lib/auth'
import { getClientes } from '@/lib/airtable'
import { clinicRuntimeMode, isClinicRuntimeFounderIdentity, isClinicRuntimeEnvironment } from '@/lib/clinic-runtime-policy'
import { ClinicPreviewClient } from './clinic-preview-client'

function clinicEnvironment() {
  return {
    VERCEL_ENV: process.env.VERCEL_ENV,
    MYAQ_CLINIC_ENABLED: process.env.MYAQ_CLINIC_ENABLED, VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
  }
}

type ClinicPreviewPageProps = {
  searchParams: Promise<{ patient?: string | string[] }>
}

export default async function ClinicPreviewPage({ searchParams }: ClinicPreviewPageProps) {
  const environment = clinicEnvironment()
  if (!isClinicRuntimeEnvironment(environment)) redirect('/my-aqslim')

  const actor = await getActor()
  if (!actor) redirect('/clinic-preview/login')
  if (!isClinicRuntimeFounderIdentity({ email: actor.email, environment })) redirect('/my-aqslim')

  const patients = await getClientes()
  const items = patients
    .map(patient => ({
      id: patient.id,
      administrationState: patientAdministration(patient.fields['Notas Generales']).state,
      name: String(patient.fields['Nombre Completo'] ?? 'Sin nombre'),
      email: String(patient.fields['Email'] ?? ''),
      phone: String(patient.fields['Teléfono'] ?? ''),
      status: String(patient.fields['Estado del Cliente'] ?? ''),
      language: String(patient.fields['Idioma Preferido'] ?? ''),
      clientNumber: patient.fields['ID Cliente'] ?? null,
      age: patient.fields['Edad'] ?? null,
      birthDate: String(patient.fields['Fecha Nacimiento'] ?? ''),
      sex: String(patient.fields['Sexo'] ?? ''),
      heightCm: patient.fields['Estatura (cm)'] ?? null,
      goalWeight: patient.fields['Peso Meta'] ?? null,
      weightUnit: String(patient.fields['Unidad de Peso'] ?? ''),
      address: String(patient.fields['Dirección'] ?? ''),
      city: String(patient.fields['Ciudad'] ?? ''),
      zip: patient.fields['ZIP'] ?? null,
      nextAppointment: String(patient.fields['Próxima Cita'] ?? ''),
      nextAppointmentService: String(patient.fields['Servicio Próxima Cita'] ?? ''),
      goal: String(patient.fields['Meta del Cliente'] ?? ''),
      conditions: String(patient.fields['Condiciones Especiales / Alergias'] ?? ''),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))

  const requestedPatient = (await searchParams).patient
  const requestedPatientId = typeof requestedPatient === 'string' ? requestedPatient : null
  const initialPatientId = items.some(patient => patient.id === requestedPatientId) ? requestedPatientId : null

  return <>{clinicRuntimeMode(environment) === 'candidate' ? <div role="status" style={{padding:16,background:'#211d12',color:'#e2c87a',textAlign:'center'}}>Candidata de publicación · Sólo lectura. Los registros de prueba están separados y no se guardarán cambios.</div> : null}<ClinicPreviewClient patients={items} initialPatientId={initialPatientId} mode={clinicRuntimeMode(environment) ?? 'preview'} /></>
}
