import 'server-only'

import { cache } from 'react'
import { currentUser } from '@clerk/nextjs/server'
import { getFast36SessionsByPatient } from '@/lib/airtable'
import { getOwnPatient } from '@/lib/auth'
import {
  pilotAccessFromFast36Enrollment,
  pilotAccessFromMetadata,
  type PilotAccess,
} from '@/lib/pilot-policy'

export type AuthenticatedPilot = PilotAccess & {
  clerkUserId: string
  firstName: string
}

export const getPilotAccess = cache(async (): Promise<AuthenticatedPilot | null> => {
  const user = await currentUser()
  if (!user) return null
  let access = pilotAccessFromMetadata(user.privateMetadata)
  if (!access) {
    try {
      const patient = await getOwnPatient()
      const sessions = await getFast36SessionsByPatient(patient.id)
      access = pilotAccessFromFast36Enrollment(sessions.length > 0)
    } catch {
      access = null
    }
  }
  if (!access) return null
  return {
    ...access,
    clerkUserId: user.id,
    firstName: user.firstName?.trim() || 'Participante',
  }
})
