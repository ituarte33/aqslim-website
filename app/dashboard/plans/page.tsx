import { currentUser } from '@clerk/nextjs/server'
import { requireCapability } from '@/lib/auth'
import { getClientes } from '@/lib/airtable'
import { patientIsUnavailable } from '@/lib/clinic-patient-administration-policy'
import { PlansClient } from './plans-client'

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ clienteId?: string }> }) {
  await requireCapability('patients:read:any')
  const [user, patients, params] = await Promise.all([currentUser(), getClientes(), searchParams])
  return <PlansClient user={user ? { firstName: user.firstName, lastName: user.lastName } : null} patients={patients.filter(patient => !patientIsUnavailable(patient)).map(patient => ({ id: patient.id, name: String(patient.fields['Nombre Completo'] ?? 'Paciente'), email: String(patient.fields.Email ?? '') }))} initialPatientId={params.clienteId ?? ''} />
}
