export const CLINIC_PREVIEW_BRANCH = 'myaq-clinic-001-preview' as const
export const CLINIC_FOUNDER_EMAIL = 'rom@ituarteconsulting.com' as const

export type ClinicPreviewEnvironment = {
  VERCEL_ENV?: string
  VERCEL_GIT_COMMIT_REF?: string
}

export function isClinicPreviewEnvironment(environment: ClinicPreviewEnvironment): boolean {
  return environment.VERCEL_ENV === 'preview'
    && environment.VERCEL_GIT_COMMIT_REF === CLINIC_PREVIEW_BRANCH
}

export function isClinicFounderIdentity({
  email,
  environment,
}: {
  email: string
  environment: ClinicPreviewEnvironment
}): boolean {
  return isClinicPreviewEnvironment(environment)
    && email.trim().toLowerCase() === CLINIC_FOUNDER_EMAIL
}
