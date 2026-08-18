'use server'

import { revalidatePath } from 'next/cache'
import { requireCapability } from '@/lib/auth'
import { updatePilotFeedbackStatus } from '@/lib/airtable'
import { isPilotFeedbackStatus } from '@/lib/pilot-feedback'

const AIRTABLE_RECORD_ID = /^rec[A-Za-z0-9]{14}$/

export async function updatePilotFeedbackStatusAction(formData: FormData) {
  await requireCapability('feedback:write:any')

  const recordId = formData.get('recordId')
  const status = formData.get('status')
  if (typeof recordId !== 'string' || !AIRTABLE_RECORD_ID.test(recordId)) {
    throw new Error('Reporte inválido')
  }
  if (!isPilotFeedbackStatus(status)) throw new Error('Estado inválido')

  await updatePilotFeedbackStatus(recordId, status)
  revalidatePath('/dashboard/pilot-feedback')
}
