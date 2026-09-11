import 'server-only'

import { cache } from 'react'
import { currentUser } from '@clerk/nextjs/server'
import { getClienteById, getClientesByEmail, type Cliente } from '@/lib/airtable'
import { runEntitlementGateShadow } from '@/lib/entitlement-gate'
import {
  AuthorizationError,
  assertPatientOwnership,
  assertRoleCapability,
  capabilitiesForRole,
  resolveAuthenticatedPatientScope,
  type AppRole,
  type Capability,
} from '@/lib/authorization-policy'
import {
  ACTIVE_PILOT_FEATURES,
  pilotAccessFromMetadata,
  type PilotFeature,
} from '@/lib/pilot-policy'
import { canReviewSyntheticPreview } from '@/lib/nutrition/synthetic-preview-policy'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

export type AuthenticatedActor = {
  clerkUserId: string
  email: string
  role: AppRole
  capabilities: ReadonlySet<Capability>
  boundPatientId: string | null
  rawPlan: unknown
  shadowPilotFeatures: ReadonlySet<PilotFeature> | null
}

function primaryEmail(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>): string | null {
  const selected = user.primaryEmailAddressId
    ? user.emailAddresses.find(address => address.id === user.primaryEmailAddressId)
    : user.emailAddresses[0]
  return selected?.emailAddress?.trim().toLowerCase() || null
}

function shadowPilotFeaturesFor(
  user: NonNullable<Awaited<ReturnType<typeof currentUser>>>,
  email: string,
  role: AppRole,
): ReadonlySet<PilotFeature> | null {
  const metadataAccess = pilotAccessFromMetadata(user.privateMetadata)
  if (metadataAccess) return metadataAccess.enabledFeatures

  const previewReviewer = canReviewSyntheticPreview({
    role,
    email,
    environment: {
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
      MYAQ_PREVIEW_REVIEWER_EMAILS: process.env.MYAQ_PREVIEW_REVIEWER_EMAILS,
    },
  })

  return previewReviewer ? new Set(ACTIVE_PILOT_FEATURES) : null
}

export const getActor = cache(async (): Promise<AuthenticatedActor | null> => {
  const user = await currentUser()
  if (!user) return null
  const email = primaryEmail(user)
  if (!email) return null
  const role: AppRole = ADMIN_EMAILS.includes(email) ? 'admin' : 'patient'
  const metadataPatientId = user.privateMetadata?.aqslimPatientId
  const boundPatientId = typeof metadataPatientId === 'string' && metadataPatientId.trim()
    ? metadataPatientId.trim()
    : null

  return {
    clerkUserId: user.id,
    email,
    role,
    capabilities: capabilitiesForRole(role),
    boundPatientId,
    rawPlan: user.privateMetadata?.plan,
    shadowPilotFeatures: shadowPilotFeaturesFor(user, email, role),
  }
})

export async function requireActor(): Promise<AuthenticatedActor> {
  const actor = await getActor()
  if (!actor) throw new AuthorizationError('UNAUTHENTICATED')
  return actor
}

export async function requireCapability(capability: Capability): Promise<AuthenticatedActor> {
  const actor = await requireActor()
  assertRoleCapability(actor.role, capability)

  if (capability === 'buddy:chat') {
    runEntitlementGateShadow({
      clerkUserId: actor.clerkUserId,
      capability: 'buddy:chat',
      currentAccessAllowed: true,
      rawPlan: actor.rawPlan,
      hasPilotAccess: actor.shadowPilotFeatures !== null,
      pilotFeatures: actor.shadowPilotFeatures ?? undefined,
    })
  }

  return actor
}

export const getOwnPatient = cache(async (): Promise<Cliente> => {
  const actor = await requireActor()
  const matches = actor.boundPatientId ? [] : await getClientesByEmail(actor.email)
  const patientId = resolveAuthenticatedPatientScope({
    role: actor.role,
    boundPatientId: actor.boundPatientId,
    matchingPatientIds: matches.map(patient => patient.id),
  })
  const patient = actor.boundPatientId
    ? await getClienteById(patientId)
    : matches[0]
  if (!patient) throw new AuthorizationError('PATIENT_NOT_FOUND')
  return patient
})

export async function requireOwnPatient(capability: Capability): Promise<Cliente> {
  await requireCapability(capability)
  return getOwnPatient()
}

export async function requirePatientOwnership(
  requestedPatientId: string,
  capability: Capability,
): Promise<Cliente> {
  const patient = await requireOwnPatient(capability)
  assertPatientOwnership(patient.id, requestedPatientId)
  return patient
}

export async function getRole(): Promise<AppRole> {
  return (await getActor())?.role ?? 'patient'
}

export async function getUserEmail(): Promise<string | null> {
  return (await getActor())?.email ?? null
}

export { AuthorizationError }
