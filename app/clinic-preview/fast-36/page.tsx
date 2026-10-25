import { notFound } from 'next/navigation'
import { getActor } from '@/lib/auth'
import { isClinicRuntimeFounderIdentity } from '@/lib/clinic-runtime-policy'
import { getClienteById } from '@/lib/airtable'
import { clinicFast36StoreEnabled, getClinicFast36Sessions } from '@/lib/clinic-fast36-store'
import { Fast36View } from '@/app/my-aqslim/pilot/fast-36/fast36-view'
export default async function ClinicFast36Page({ searchParams }: { searchParams: Promise<{ patient?: string }> }) {
  if (!clinicFast36StoreEnabled()) notFound()
  const actor = await getActor()
  if (!actor || !isClinicRuntimeFounderIdentity({ email: actor.email, environment: { VERCEL_ENV: process.env.VERCEL_ENV, MYAQ_CLINIC_ENABLED: process.env.MYAQ_CLINIC_ENABLED, VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF } })) notFound()
  const { patient: patientId = '' } = await searchParams
  if (!/^rec[A-Za-z0-9]{14}$/.test(patientId)) notFound()
  const [patient, sessions] = await Promise.all([getClienteById(patientId), getClinicFast36Sessions(patientId)])
  if (!patient || !sessions.length) notFound()
  return <Fast36View firstName={String(patient.fields['Nombre Completo'] ?? 'Paciente').split(' ')[0]} profileId={patientId} initialLanguage="es" sessions={sessions} clinicPreviewPatientId={patientId} />
}
