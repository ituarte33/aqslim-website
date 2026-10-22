import { getClinicFast36Sessions } from '@/lib/clinic-fast36-store'
import { redirect } from 'next/navigation'
import { getPilotAccess } from '@/lib/pilot-access'
import { getPatientPortalData } from '@/lib/patient-portal'
import { getFast36SessionsByPatient } from '@/lib/airtable'
import { selectPilotDisplayFirstName } from '@/lib/pilot-policy'
import { PilotView } from './pilot-view'

export const metadata = {
  title: 'MYAQ Soft Start 01 — AQSLIM',
  description: 'Private AQSLIM early-access pilot',
}

export default async function PilotPage() {
  const [pilot, patient] = await Promise.all([
    getPilotAccess(),
    getPatientPortalData(),
  ])
  if (!pilot) redirect('/my-aqslim')
  const previewFast36Sessions = patient ? await getClinicFast36Sessions(patient.clienteId) : []
  const fast36Sessions = patient
    ? await getFast36SessionsByPatient(patient.clienteId).catch(() => [])
    : []
  return (
    <PilotView
      pilot={{
        ...pilot,
        firstName: selectPilotDisplayFirstName(pilot.firstName, patient?.firstName),
        language: patient?.language ?? pilot.language,
      }}
      profileId={patient?.clienteId ?? pilot.clerkUserId}
      linkedProfileName={patient?.fullName ?? null}
      fast36Enabled={previewFast36Sessions.length > 0 || fast36Sessions.length > 0}
    />
  )
}
