import { isEntitlementEnforcementPreviewBranch } from './nutrition/synthetic-preview-policy.ts'

export const P3_PREVIEW_ENFORCEMENT_FLAG = 'MYAQ_P3_ENFORCEMENT'

export function isP3PreviewEnforcementEnabled(environment: {
  VERCEL_ENV?: string
  VERCEL_GIT_COMMIT_REF?: string
  MYAQ_P3_ENFORCEMENT?: string
}): boolean {
  return environment.VERCEL_ENV === 'preview'
    && isEntitlementEnforcementPreviewBranch(environment.VERCEL_GIT_COMMIT_REF)
    && environment.MYAQ_P3_ENFORCEMENT?.trim().toLowerCase() === 'enabled'
}
