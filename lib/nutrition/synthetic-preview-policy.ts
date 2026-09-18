export const SYNTHETIC_PREVIEW_BRANCH = 'myaq-rec-001-preview-010'
export const ENTITLEMENT_PREVIEW_BRANCH = 'myaq-entitlement-preview-001'
export const AQ_BUDDY_OPENAI_PREVIEW_BRANCH = 'myaq-ai-001-aq-buddy-openai-preview'
export const ENTITLEMENT_P2_PREVIEW_BRANCH = 'myaq-ent-p2-preenforcement-preview'
export const ENTITLEMENT_P3_PREVIEW_BRANCH = 'myaq-ent-p3-preview-enforcement-candidate'
export const ENTITLEMENT_P4_PREVIEW_BRANCH = 'myaq-ent-p4-preview-provisioning'
export const ENTITLEMENT_P5_PREVIEW_BRANCH = 'myaq-ent-p5-founder-real-user-preview-canary'
export const ENTITLEMENT_P5_1_PREVIEW_BRANCH = 'myaq-ent-p5-1-extended-ai-live-canary'
export const MYAQ_CLIENT_PREVIEW_BRANCH = 'myaq-client-001-preview'
export const SYNTHETIC_PREVIEW_CLIENT_ID = 'SYN-CLIENT-001'
export const SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID = 'appuUHRs26ATXnZjf'

const ALLOWED_PREVIEW_BRANCHES = new Set([
  SYNTHETIC_PREVIEW_BRANCH,
  ENTITLEMENT_PREVIEW_BRANCH,
  AQ_BUDDY_OPENAI_PREVIEW_BRANCH,
  ENTITLEMENT_P2_PREVIEW_BRANCH,
  ENTITLEMENT_P3_PREVIEW_BRANCH,
  ENTITLEMENT_P4_PREVIEW_BRANCH,
  ENTITLEMENT_P5_PREVIEW_BRANCH,
  ENTITLEMENT_P5_1_PREVIEW_BRANCH,
  MYAQ_CLIENT_PREVIEW_BRANCH,
])

const ENTITLEMENT_ENFORCEMENT_PREVIEW_BRANCHES = new Set([
  ENTITLEMENT_P3_PREVIEW_BRANCH,
  ENTITLEMENT_P4_PREVIEW_BRANCH,
  ENTITLEMENT_P5_PREVIEW_BRANCH,
  ENTITLEMENT_P5_1_PREVIEW_BRANCH,
])

const REANALYSIS_AUDIT_PREVIEW_BRANCHES = new Set([
  ...ENTITLEMENT_ENFORCEMENT_PREVIEW_BRANCHES,
  MYAQ_CLIENT_PREVIEW_BRANCH,
])

export function isSyntheticPreviewEnvironment(environment: {
  VERCEL_ENV?: string
  VERCEL_GIT_COMMIT_REF?: string
}) {
  return environment.VERCEL_ENV === 'preview'
    && Boolean(environment.VERCEL_GIT_COMMIT_REF)
    && ALLOWED_PREVIEW_BRANCHES.has(environment.VERCEL_GIT_COMMIT_REF as string)
}

export function isEntitlementEnforcementPreviewBranch(branch?: string): boolean {
  return Boolean(branch) && ENTITLEMENT_ENFORCEMENT_PREVIEW_BRANCHES.has(branch as string)
}

export function isReanalysisAuditPreviewBranch(branch?: string): boolean {
  return Boolean(branch) && REANALYSIS_AUDIT_PREVIEW_BRANCHES.has(branch as string)
}

export function hasSyntheticPreviewStorageConfiguration(environment: {
  AIRTABLE_BASE_ID?: string
  AIRTABLE_PAT?: string
}) {
  return environment.AIRTABLE_BASE_ID === SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID
    && Boolean(environment.AIRTABLE_PAT)
}

export function isAllowedSyntheticPreviewClient(clientId: unknown): clientId is typeof SYNTHETIC_PREVIEW_CLIENT_ID {
  return clientId === SYNTHETIC_PREVIEW_CLIENT_ID
}

function previewReviewerEmails(value?: string) {
  return new Set(
    (value ?? '')
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(Boolean),
  )
}

export function canReviewSyntheticPreview({
  role,
  email,
  environment,
}: {
  role: 'admin' | 'patient'
  email: string
  environment: {
    VERCEL_ENV?: string
    VERCEL_GIT_COMMIT_REF?: string
    MYAQ_PREVIEW_REVIEWER_EMAILS?: string
  }
}) {
  if (!isSyntheticPreviewEnvironment(environment)) return false
  if (role === 'admin') return true

  return previewReviewerEmails(environment.MYAQ_PREVIEW_REVIEWER_EMAILS)
    .has(email.trim().toLowerCase())
}

export function syntheticPreviewScopeKey(accountId: string, clientId: string) {
  return `preview:${accountId}:${clientId}`
}
