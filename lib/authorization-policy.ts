export type AppRole = 'admin' | 'patient'

export type Capability =
  | 'patients:read:any'
  | 'patients:write:any'
  | 'consultations:read:any'
  | 'consultations:write:any'
  | 'appointments:book:any'
  | 'appointments:book:self'
  | 'buddy:chat'
  | 'profile:write:self'
  | 'questionnaire:write:self'
  | 'portal:read:self'

const ADMIN_CAPABILITIES: ReadonlySet<Capability> = new Set([
  'patients:read:any',
  'patients:write:any',
  'consultations:read:any',
  'consultations:write:any',
  'appointments:book:any',
  'appointments:book:self',
  'buddy:chat',
  'profile:write:self',
  'questionnaire:write:self',
  'portal:read:self',
])

const PATIENT_CAPABILITIES: ReadonlySet<Capability> = new Set([
  'appointments:book:self',
  'buddy:chat',
  'profile:write:self',
  'questionnaire:write:self',
  'portal:read:self',
])

export class AuthorizationError extends Error {
  readonly code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'PATIENT_NOT_FOUND' | 'PATIENT_IDENTITY_AMBIGUOUS'

  constructor(
    code: AuthorizationError['code'],
    message = 'Access denied',
  ) {
    super(message)
    this.name = 'AuthorizationError'
    this.code = code
  }
}

export function capabilitiesForRole(role: AppRole): ReadonlySet<Capability> {
  return role === 'admin' ? ADMIN_CAPABILITIES : PATIENT_CAPABILITIES
}

export function roleHasCapability(role: AppRole, capability: Capability): boolean {
  return capabilitiesForRole(role).has(capability)
}

export function assertRoleCapability(role: AppRole, capability: Capability): void {
  if (!roleHasCapability(role, capability)) {
    throw new AuthorizationError('FORBIDDEN')
  }
}

export function assertPatientOwnership(ownedPatientId: string, requestedPatientId: string): void {
  if (!ownedPatientId || !requestedPatientId || ownedPatientId !== requestedPatientId) {
    throw new AuthorizationError('FORBIDDEN')
  }
}

export function selectUniquePatientId(
  boundPatientId: string | null,
  matchingPatientIds: readonly string[],
): string {
  if (boundPatientId) return boundPatientId
  if (matchingPatientIds.length === 0) {
    throw new AuthorizationError('PATIENT_NOT_FOUND')
  }
  if (matchingPatientIds.length !== 1) {
    throw new AuthorizationError('PATIENT_IDENTITY_AMBIGUOUS')
  }
  return matchingPatientIds[0]
}

export function resolveAuthenticatedPatientScope({
  role,
  boundPatientId,
  matchingPatientIds,
  requestedPatientId,
}: {
  role: AppRole
  boundPatientId: string | null
  matchingPatientIds: readonly string[]
  requestedPatientId?: string
}): string {
  assertRoleCapability(role, 'portal:read:self')
  const patientId = selectUniquePatientId(boundPatientId, matchingPatientIds)
  if (requestedPatientId) assertPatientOwnership(patientId, requestedPatientId)
  return patientId
}
