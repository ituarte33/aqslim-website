import type { CanonicalEntitlementRecord } from './entitlement-record'
import { provisioningPlanForClinicVisit } from './p4-provisioning-policy'
import { resolveClinicLifecycle } from './clinic-lifecycle'

export type OnboardingAccount = { id: string; boundPatientId: string | null; verified: boolean; protectedAccess: boolean }
export type OnboardingEvidence = {
  patientId: string
  email: string
  matchingPatientIds: string[]
  accounts: OnboardingAccount[]
  source: { isOperational?: boolean; airtableRecordId: string; storedSubjectId: string; record: CanonicalEntitlementRecord } | null
  lastCompletedVisit: string | null
  eligibleTrialVisit?: { id: string; date: string; type: string } | null
  today: string
}
export function planClinicClientOnboarding(e: OnboardingEvidence) {
  const blockers: string[] = []
  const account = e.accounts.length === 1 ? e.accounts[0] : null
  if (!e.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.email)) blockers.push('Completa un correo válido en el expediente.')
  if (e.matchingPatientIds.length !== 1 || e.matchingPatientIds[0] !== e.patientId) blockers.push('El correo debe pertenecer a un solo expediente.')
  if (!e.accounts.length) blockers.push('El cliente debe crear primero su cuenta My AQSLIM con este mismo correo.')
  else if (!account) blockers.push('Hay más de una cuenta con este correo. Revisa la identidad.')
  if (account && !account.verified) blockers.push('El cliente debe verificar su correo en My AQSLIM.')
  if (account?.boundPatientId && account.boundPatientId !== e.patientId) blockers.push('La cuenta ya está vinculada a otro expediente.')
  if (e.source && e.source.storedSubjectId !== account?.id && e.source.storedSubjectId !== `patient:${e.patientId}`) blockers.push('El acceso existente pertenece a otra cuenta.')
  const lifecycle = resolveClinicLifecycle(e.lastCompletedVisit, e.today).lifecycle
  if (!e.source) {
    if (account?.protectedAccess) blockers.push('La cuenta tiene acceso previo. Revisa su origen antes de darla de alta.')
    if (lifecycle === 'UNRESOLVED') blockers.push('Falta una consulta real válida registrada en Consultas.')
    if (lifecycle === 'INACTIVE') blockers.push('La última consulta supera 60 días. Registra primero la nueva consulta real.')
  }
  const operation = blockers.length ? 'blocked' : e.source
    ? account?.boundPatientId === e.patientId ? 'already_linked' : 'link_existing'
    : 'create_basic'
  const trialPlan = e.eligibleTrialVisit && !e.source ? provisioningPlanForClinicVisit({
    visitType: e.eligibleTrialVisit.type, completedAt: new Date(`${e.eligibleTrialVisit.date}T00:00:00.000Z`), existingRecord: null,
  }) : null
  const trial = trialPlan?.action === 'start_or_renew_trial' && trialPlan.trialEnds && trialPlan.trialEnds > `${e.today}T00:00:00.000Z` ? trialPlan : null
  const newGrant = { tier: trial ? 'clinic_ai' : 'portal_basic', status: trial ? 'trial' : 'active',
    source: trial ? 'clinic_ai_trial' : 'clinic_visit', trialStarts: trial?.trialStarts ?? null, trialEnds: trial?.trialEnds ?? null }
  return { operation, blockers, lifecycle, newGrant, manuallyRestricted: e.source?.record.status === 'suspended' || e.source?.record.override === 'deny', lastCompletedVisit: e.lastCompletedVisit,
    accountLabel: !account ? e.accounts.length ? 'Cuenta ambigua' : 'Cuenta pendiente' : account.verified ? 'Correo verificado' : 'Correo sin verificar',
    accessLabel: e.source ? `Conservar ${e.source.record.tier} · ${e.source.record.status}` : trial ? `Portal y prueba de IA hasta ${trial.trialEnds?.slice(0, 10)} · desde la consulta original` : 'Portal básico · guía y seguimiento · sin suscripción de IA',
  }
}
