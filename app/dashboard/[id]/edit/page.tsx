import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { getClienteById } from '@/lib/airtable'
import { getRole } from '@/lib/auth'
import { EditPatientClient } from './edit-patient-client'

export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const role = await getRole()
  if (role !== 'admin') notFound()

  const { id } = await params
  const patient = await getClienteById(id)

  return <EditPatientClient patient={patient} />
}
