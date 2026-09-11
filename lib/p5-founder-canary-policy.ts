import type { CanonicalEntitlementRecord } from './entitlement-record'
import { ENTITLEMENT_P5_PREVIEW_BRANCH } from './nutrition/synthetic-preview-policy'

export const P5_FOUNDER_CANARY_FLAG = 'MYAQ_P5_FOUNDER_CANARY' as const
export const P5_FOUNDER_CANARY_REASON_MARKER = 'P5_FOUNDER_REAL_USER_CANARY' as const
export const P5_FOUNDER_CANARY_EMAIL = 'rom@ituarteconsulting.com' as const

export function isP5FounderCanaryEnvironment(environment: {
  VERCEL_ENV?: string
  VERCEL_GIT_COMMIT_REF?: string
  MYAQ_P5_FOUNDER_CANARY?: string
}): boolean {
  return environment.VERCEL_ENV === 'preview'
    && environment.VERCEL_GIT_COMMIT_REF === ENTITLEMENT_P5_PREVIEW_BRANCH
    && environment.MYAQ_P5_FOUNDER_CANARY?.trim().toLowerCase() === 'enabled'
}

export function isP5FounderCanaryIdentity({
  email,
  environment,
}: {
  email: string
  environment: {
    VERCEL_ENV?: string
    VERCEL_GIT_COMMIT_REF?: string
    MYAQ_P5_FOUNDER_CANARY?: string
  }
}): boolean {
  return isP5FounderCanaryEnvironment(environment)
    && email.trim().toLowerCase() === P5_FOUNDER_CANARY_EMAIL
}

export function isP5FounderCanaryRecord(record: CanonicalEntitlementRecord): boolean {
  return record.tier === 'clinic_ai'
    && record.source === 'clinic_ai_trial'
    && record.entitlementReason.includes(P5_FOUNDER_CANARY_REASON_MARKER)
}
