import { redirect } from 'next/navigation'
import { getPilotAccess } from '@/lib/pilot-access'
import { getPatientPortalData } from '@/lib/patient-portal'
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
  return (
    <PilotView
      pilot={{
        ...pilot,
        firstName: selectPilotDisplayFirstName(pilot.firstName, patient?.firstName),
      }}
      linkedProfileName={patient?.fullName ?? null}
    />
  )
}
