import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { buildCanonicalEntitlementContext } from '@/lib/entitlement-context'
import { resolveCapabilityEntitlement } from '@/lib/entitlement-resolver'
import { usagePolicyForEntitlementTier } from '@/lib/entitlement-usage-policy'
import { ENTITLEMENT_P3_PREVIEW_BRANCH } from '@/lib/nutrition/synthetic-preview-policy'

export const dynamic = 'force-dynamic'

const FOUNDER_EMAIL = 'rom@ituarteconsulting.com'
const CANARY_SUBJECT_ID = 'canary_clinic_ai_romtest_v1'
const CANARY_PATIENT_RECORD_ID = 'recBdRTfuT2S1lFJP'

function primaryEmail(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>): string | null {
  const selected = user.primaryEmailAddressId
    ? user.emailAddresses.find(address => address.id === user.primaryEmailAddressId)
    : user.emailAddresses[0]
  return selected?.emailAddress?.trim().toLowerCase() || null
}

function scenario(
  label: string,
  record: NonNullable<Awaited<ReturnType<typeof buildCanonicalEntitlementContext>>['record']>,
  nowIso: string,
) {
  const now = new Date(nowIso)
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(now)
  const buddy = resolveCapabilityEntitlement({ record, capability: 'buddy:chat', today, now })
  const foodScan = resolveCapabilityEntitlement({ record, capability: 'food_scan:analyze', today, now })
  return { label, today, buddy, foodScan }
}

export default async function ClinicAiCanaryPage() {
  if (
    process.env.VERCEL_ENV !== 'preview'
    || process.env.VERCEL_GIT_COMMIT_REF !== ENTITLEMENT_P3_PREVIEW_BRANCH
    || process.env.MYAQ_P3_ENFORCEMENT !== 'enabled'
  ) {
    redirect('/my-aqslim')
  }

  const user = await currentUser()
  if (!user || primaryEmail(user) !== FOUNDER_EMAIL) redirect('/my-aqslim')

  const context = await buildCanonicalEntitlementContext({
    subjectId: CANARY_SUBJECT_ID,
    rawPlan: null,
    hasPilotAccess: false,
    authenticatedPatientRecordId: CANARY_PATIENT_RECORD_ID,
    now: new Date('2026-09-11T20:40:00.000Z'),
  })

  if (!context.record) {
    return (
      <main style={{ padding: 32, fontFamily: 'system-ui', background: '#111', color: '#eee', minHeight: '100vh' }}>
        <h1>Clinic AI Canary</h1>
        <p>FAIL — no canonical entitlement record resolved.</p>
      </main>
    )
  }

  const scenarios = [
    scenario('Today / active trial', context.record, '2026-09-11T20:40:00.000Z'),
    scenario('After trial expiry', context.record, '2026-10-10T20:40:00.000Z'),
    scenario('61+ days without clinic visit', context.record, '2026-11-10T20:40:00.000Z'),
  ]
  const usage = usagePolicyForEntitlementTier('clinic_ai', 'food_scan')

  const expectedPass = (
    context.sourceKind === 'preview_store'
    && context.record.tier === 'clinic_ai'
    && usage.dailyLimit === 3
    && usage.monthlyLimit === 90
    && scenarios[0].buddy.decision === 'allow'
    && scenarios[0].buddy.reason === 'CLINIC_AI_TRIAL_ACTIVE'
    && scenarios[0].buddy.lifecycle === 'ACTIVE'
    && scenarios[1].buddy.decision === 'deny'
    && scenarios[1].buddy.reason === 'CLINIC_AI_TRIAL_EXPIRED'
    && scenarios[1].buddy.lifecycle === 'GRACE'
    && scenarios[2].buddy.decision === 'deny'
    && scenarios[2].buddy.reason === 'CLINIC_INACTIVE'
    && scenarios[2].buddy.lifecycle === 'INACTIVE'
  )

  return (
    <main style={{ padding: 32, fontFamily: 'system-ui', background: '#111', color: '#eee', minHeight: '100vh' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <p style={{ color: '#d5b34c', letterSpacing: 1.5, textTransform: 'uppercase' }}>MYAQ-ENT-P3 / Preview only</p>
        <h1>Clinic AI Canary</h1>
        <p style={{ fontSize: 22, fontWeight: 700 }}>{expectedPass ? 'PASS' : 'REVIEW REQUIRED'}</p>
        <p>This diagnostic does not alter the Founder account. It resolves a separate synthetic subject against the Preview entitlement store and the linked test patient lifecycle.</p>

        <section style={{ border: '1px solid #444', padding: 20, marginTop: 24 }}>
          <h2>Canonical entitlement</h2>
          <p>Source: <strong>{context.sourceKind}</strong></p>
          <p>Tier: <strong>{context.record.tier}</strong></p>
          <p>Status: <strong>{context.record.status}</strong></p>
          <p>Last completed visit: <strong>{context.record.lastCompletedVisit ?? 'UNRESOLVED'}</strong></p>
          <p>Trial: <strong>{context.record.trialStarts ?? '—'} → {context.record.trialEnds ?? '—'}</strong></p>
        </section>

        <section style={{ border: '1px solid #444', padding: 20, marginTop: 20 }}>
          <h2>Food Scan usage policy</h2>
          <p><strong>{usage.dailyLimit}/day · {usage.monthlyLimit}/month</strong></p>
        </section>

        {scenarios.map(item => (
          <section key={item.label} style={{ border: '1px solid #444', padding: 20, marginTop: 20 }}>
            <h2>{item.label}</h2>
            <p>Date: {item.today}</p>
            <p>Lifecycle: <strong>{item.buddy.lifecycle}</strong></p>
            <p>AQ Buddy: <strong>{item.buddy.decision}</strong> — {item.buddy.reason}</p>
            <p>Food Scan: <strong>{item.foodScan.decision}</strong> — {item.foodScan.reason}</p>
            <p>Portal access: <strong>{item.buddy.portalAccess}</strong></p>
          </section>
        ))}
      </div>
    </main>
  )
}
