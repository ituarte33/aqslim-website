import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { getClienteById, getPlanById } from '@/lib/airtable'
import { getRole } from '@/lib/auth'
import { EditPatientClient } from './edit-patient-client'

export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const role = await getRole()
  if (role !== 'admin') notFound()

  const { id } = await params
  const patient = await getClienteById(id)
  const planId = patient.fields['Plan AQSLIM']?.[0]
  const plan = planId ? await getPlanById(planId).catch(() => null) : null

  return <EditPatientClient patient={patient} plan={plan} />
}
