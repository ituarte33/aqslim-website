import { ENTITLEMENT_P3_PREVIEW_BRANCH } from './nutrition/synthetic-preview-policy.ts'

export const P3_PREVIEW_ENFORCEMENT_FLAG = 'MYAQ_P3_ENFORCEMENT'

export function isP3PreviewEnforcementEnabled(environment: {
  VERCEL_ENV?: string
  VERCEL_GIT_COMMIT_REF?: string
  MYAQ_P3_ENFORCEMENT?: string
}): boolean {
  return environment.VERCEL_ENV === 'preview'
    && environment.VERCEL_GIT_COMMIT_REF === ENTITLEMENT_P3_PREVIEW_BRANCH
    && environment.MYAQ_P3_ENFORCEMENT?.trim().toLowerCase() === 'enabled'
}
