import 'server-only'

import { cache } from 'react'
import { currentUser } from '@clerk/nextjs/server'
import { pilotAccessFromMetadata, type PilotAccess } from '@/lib/pilot-policy'

export type AuthenticatedPilot = PilotAccess & {
  clerkUserId: string
  firstName: string
}

export const getPilotAccess = cache(async (): Promise<AuthenticatedPilot | null> => {
  const user = await currentUser()
  if (!user) return null
  const access = pilotAccessFromMetadata(user.privateMetadata)
  if (!access) return null
  return {
    ...access,
    clerkUserId: user.id,
    firstName: user.firstName?.trim() || 'Participante',
  }
})
