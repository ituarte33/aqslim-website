import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requireCapability, AuthorizationError } from '@/lib/auth'
import { getPilotFeedback } from '@/lib/airtable'
import { PilotFeedbackClient } from './pilot-feedback-client'

export default async function PilotFeedbackPage() {
  try {
    await requireCapability('feedback:read:any')
  } catch (error) {
    if (error instanceof AuthorizationError && error.code === 'UNAUTHENTICATED') {
      redirect('/sign-in')
    }
    redirect('/dashboard')
  }

  const user = await currentUser()
  let reports: Awaited<ReturnType<typeof getPilotFeedback>> = []
  let airtableError: string | null = null
  try {
    reports = await getPilotFeedback()
  } catch (error) {
    airtableError = error instanceof Error ? error.message : String(error)
  }

  return (
    <PilotFeedbackClient
      user={user ? { firstName: user.firstName, lastName: user.lastName } : null}
      reports={reports}
      airtableError={airtableError}
    />
  )
}
