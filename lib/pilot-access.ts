import 'server-only'

import { cache } from 'react'
import { currentUser } from '@clerk/nextjs/server'
import { getFast36SessionsByPatient } from '@/lib/airtable'
import { getOwnPatient } from '@/lib/auth'
import { canReviewSyntheticPreview } from '@/lib/nutrition/synthetic-preview-policy'
import {
  ACTIVE_PILOT_FEATURES,
  PILOT_COHORT_ID,
  pilotAccessFromFast36Enrollment,
  pilotAccessFromMetadata,
  type PilotAccess,
} from '@/lib/pilot-policy'

export type AuthenticatedPilot = PilotAccess & {
  clerkUserId: string
  firstName: string
}

function primaryEmail(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>): string | null {
  const selected = user.primaryEmailAddressId
    ? user.emailAddresses.find(address => address.id === user.primaryEmailAddressId)
    : user.emailAddresses[0]
  return selected?.emailAddress?.trim().toLowerCase() || null
}

function previewReviewerAccess(
  user: NonNullable<Awaited<ReturnType<typeof currentUser>>>,
): PilotAccess | null {
  const email = primaryEmail(user)
  if (!email) return null

  const allowed = canReviewSyntheticPreview({
    role: 'patient',
    email,
    environment: {
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
      MYAQ_PREVIEW_REVIEWER_EMAILS: process.env.MYAQ_PREVIEW_REVIEWER_EMAILS,
    },
  })
  if (!allowed) return null

  return {
    cohort: PILOT_COHORT_ID,
    role: 'participant',
    language: 'es',
    enabledFeatures: new Set(ACTIVE_PILOT_FEATURES),
  }
}

export const getPilotAccess = cache(async (): Promise<AuthenticatedPilot | null> => {
  const user = await currentUser()
  if (!user) return null

  let access = pilotAccessFromMetadata(user.privateMetadata)
  if (!access) access = previewReviewerAccess(user)
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
