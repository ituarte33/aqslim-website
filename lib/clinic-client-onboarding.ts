import 'server-only'
import { patientIsUnavailable } from './clinic-patient-administration-policy'
import { createHash } from 'node:crypto'
import { clerkClient } from '@clerk/nextjs/server'
import { getClienteById, getClientesByEmail } from './airtable'
import { getLinkedClinicConsultationsByPatientId } from './clinic-consultation-source'
import { isEligibleClinicAiTrialVisitType } from './clinic-ai-trial-policy'
import { lastCompletedVisitFromConsultations } from './clinic-visit-policy'
import { clinicRuntimeMode } from './clinic-runtime-policy'
import { planClinicClientOnboarding, type OnboardingEvidence } from './clinic-client-onboarding-policy'
import { SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID } from './nutrition/synthetic-preview-policy'
import { ENTITLEMENT_RECORD_VERSION } from './entitlement-record'
import { PREVIEW_ENTITLEMENT_FIELDS as F, PREVIEW_ENTITLEMENTS_TABLE, getPortalAccessRecordByPatientRecordId } from './preview-entitlement-store'

export async function resolveClinicClientOnboarding(patientId: string, now = new Date()) {
  if (process.env.AIRTABLE_BASE_ID !== SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID || !process.env.AIRTABLE_PAT) throw new Error('EXECUTION_NOT_CONFIGURED')
  if (!/^rec[A-Za-z0-9]{14}$/.test(patientId)) throw new Error('INVALID_PATIENT')
  const patient = await getClienteById(patientId)
  if (!patient) throw new Error('PATIENT_NOT_FOUND')
  if (patientIsUnavailable(patient)) throw new Error('PATIENT_ARCHIVED')
  const email = String(patient.fields['Email'] ?? '').trim().toLowerCase()
  const clerk = await clerkClient()
  // Provider errors are errors, never interpreted as "no existing access/account".
  const [patients, users, source, visits] = await Promise.all([
    email ? getClientesByEmail(email) : Promise.resolve([]),
    email ? clerk.users.getUserList({ emailAddress: [email], limit: 3 }) : Promise.resolve({ data: [] }),
    getPortalAccessRecordByPatientRecordId({ patientRecordId: patientId, canonicalSubjectId: `patient:${patientId}`, reviewOnly: true }),
    getLinkedClinicConsultationsByPatientId(patientId),
  ])
  const linkedVisits = visits.filter(v => v.fields['ID Cliente']?.includes(patientId))
  const eligibleTrialVisit = linkedVisits.filter(v => isEligibleClinicAiTrialVisitType(v.fields['Tipo de Consulta']))
    .map(v => ({ id: v.id, date: lastCompletedVisitFromConsultations([v]), type: v.fields['Tipo de Consulta']! }))
    .filter((v): v is { id: string; date: string; type: string } => Boolean(v.date))
    .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
  const evidence: OnboardingEvidence = {
    patientId, email, matchingPatientIds: patients.map(p => p.id), source,
    accounts: users.data.filter(u => u.emailAddresses.some(a => a.emailAddress.trim().toLowerCase() === email)).map(u => ({
      id: u.id,
      boundPatientId: typeof u.privateMetadata.aqslimPatientId === 'string' ? u.privateMetadata.aqslimPatientId.trim() || null : null,
      verified: u.emailAddresses.some(a => a.emailAddress.trim().toLowerCase() === email && a.verification?.status === 'verified'),
      protectedAccess: Boolean(u.privateMetadata.pilotAccess || u.privateMetadata.plan || u.privateMetadata.pilot),
    })),
    lastCompletedVisit: lastCompletedVisitFromConsultations(linkedVisits), eligibleTrialVisit,
    today: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(now),
  }
  const plan = planClinicClientOnboarding(evidence)
  const fingerprint = createHash('sha256').update(JSON.stringify(evidence)).digest('hex')
  return { evidence, review: { ...plan, email, fingerprint, executionEnabled: clinicRuntimeMode() === 'production' } }
}

export async function executeClinicClientOnboarding({ patientId, fingerprint, actorEmail, now = new Date() }: {
  patientId: string; fingerprint: string; actorEmail: string; now?: Date
}) {
  // General client provisioning is deliberately unavailable on the internal pilot branch.
  if (clinicRuntimeMode() !== 'production') throw new Error('CLIENT_ONBOARDING_READ_ONLY')
  const snapshot = await resolveClinicClientOnboarding(patientId, now)
  if (snapshot.review.fingerprint !== fingerprint) throw new Error('REVIEW_CHANGED')
  if (snapshot.review.operation === 'blocked') throw new Error('ONBOARDING_BLOCKED')
  if (snapshot.review.operation === 'already_linked') return { state: 'already_linked', verified: true }
  const account = snapshot.evidence.accounts[0]
  let source = snapshot.evidence.source
  if (!source) {
    // Trial dates, when eligible, come from the original real visit; never from alta.
    // No fabricated visit or payment. No automatic retry after an uncertain write.
    const base = process.env.AIRTABLE_BASE_ID
    const pat = process.env.AIRTABLE_PAT
    if (!base || !pat) throw new Error('EXECUTION_NOT_CONFIGURED')
    const response = await fetch(`https://api.airtable.com/v0/${base}/${PREVIEW_ENTITLEMENTS_TABLE}`, {
      method: 'POST', cache: 'no-store',
      headers: { Authorization: `Bearer ${pat}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: [{ fields: {
        [F.SUBJECT_ID]: account.id, [F.PATIENT_RECORD_ID]: patientId,
        [F.TIER]: snapshot.review.newGrant.tier, [F.STATUS]: snapshot.review.newGrant.status, [F.SOURCE]: snapshot.review.newGrant.source,
        ...(snapshot.review.newGrant.trialStarts ? { [F.TRIAL_STARTS]: snapshot.review.newGrant.trialStarts, [F.TRIAL_ENDS]: snapshot.review.newGrant.trialEnds } : {}),
        [F.LAST_COMPLETED_VISIT]: snapshot.evidence.lastCompletedVisit,
        [F.REASON]: `MYAQ_CLINIC_CLIENT_ONBOARDING; actor=${actorEmail}`,
        [F.LAST_ACCESS_CHANGE]: now.toISOString(), [F.RECORD_VERSION]: ENTITLEMENT_RECORD_VERSION,
        [F.PREVIEW_ONLY]: false,
      } }] }),
    })
    if (!response.ok) throw new Error('ONBOARDING_WRITE_FAILED')
    source = await getPortalAccessRecordByPatientRecordId({ patientRecordId: patientId, canonicalSubjectId: account.id })
    if (!source?.isOperational || source.record.tier !== snapshot.review.newGrant.tier || source?.record.trialStarts !== snapshot.review.newGrant.trialStarts || source?.record.trialEnds !== snapshot.review.newGrant.trialEnds || source.storedSubjectId !== account.id) throw new Error('ONBOARDING_VERIFY_FAILED')
  }
  const clerk = await clerkClient()
  const current = await clerk.users.getUser(account.id)
  const bound = current.privateMetadata.aqslimPatientId
  if (bound && bound !== patientId) throw new Error('ACCOUNT_BINDING_CHANGED')
  if (!current.emailAddresses.some(a => a.emailAddress.trim().toLowerCase() === snapshot.evidence.email && a.verification?.status === 'verified')) throw new Error('ACCOUNT_EMAIL_CHANGED')
  // Clerk merges these metadata keys; all unrelated private metadata is preserved.
  await clerk.users.updateUserMetadata(account.id, { privateMetadata: {
    aqslimPatientId: patientId,
    aqslimClientOnboarding: { actor: actorEmail, at: now.toISOString(), accessRecord: source.airtableRecordId },
  } })
  const [verifiedAccount, verifiedSource] = await Promise.all([
    clerk.users.getUser(account.id),
    getPortalAccessRecordByPatientRecordId({ patientRecordId: patientId, canonicalSubjectId: account.id, reviewOnly: true }),
  ])
  if (verifiedAccount.privateMetadata.aqslimPatientId !== patientId || verifiedSource?.airtableRecordId !== source.airtableRecordId) throw new Error('ONBOARDING_VERIFY_FAILED')
  return { state: 'linked', verified: true }
}
