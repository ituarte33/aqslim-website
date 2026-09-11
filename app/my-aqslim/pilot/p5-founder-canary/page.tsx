import { redirect } from 'next/navigation'
import { getActor } from '@/lib/auth'
import { runP3PreviewEntitlementGate } from '@/lib/p3-entitlement-gate'
import { usagePolicyForEntitlementTier } from '@/lib/entitlement-usage-policy'
import {
  ENTITLEMENT_P5_PREVIEW_BRANCH,
} from '@/lib/nutrition/synthetic-preview-policy'
import { isP5FounderCanaryEnvironment } from '@/lib/p5-founder-canary-policy'

export const dynamic = 'force-dynamic'

const FOUNDER_EMAIL = 'rom@ituarteconsulting.com'

const CAPABILITIES = [
  ['AQ Buddy', 'buddy:chat'],
  ['Food Scan', 'food_scan:analyze'],
  ['Fridge Recipes', 'fridge_recipe:generate'],
  ['Restaurant Advisor', 'restaurant_menu:analyze'],
  ['Weekly Summary', 'weekly_summary:generate'],
] as const

function cardStyle(): React.CSSProperties {
  return {
    border: '1px solid #444',
    padding: 20,
    marginTop: 18,
    background: '#151515',
  }
}

export default async function P5FounderCanaryPage() {
  const enabled = isP5FounderCanaryEnvironment({
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
    MYAQ_P5_FOUNDER_CANARY: process.env.MYAQ_P5_FOUNDER_CANARY,
  })
  if (!enabled || process.env.VERCEL_GIT_COMMIT_REF !== ENTITLEMENT_P5_PREVIEW_BRANCH) {
    redirect('/my-aqslim')
  }

  const actor = await getActor()
  if (!actor || actor.email !== FOUNDER_EMAIL || !actor.boundPatientId) redirect('/my-aqslim')

  const results = await Promise.all(CAPABILITIES.map(async ([label, capability]) => ({
    label,
    capability,
    result: await runP3PreviewEntitlementGate({
      clerkUserId: actor.clerkUserId,
      capability,
      rawPlan: actor.rawPlan,
      hasPilotAccess: actor.shadowPilotFeatures !== null,
      authenticatedPatientRecordId: actor.boundPatientId,
    }),
  })))

  const allClinicAi = results.every(({ result }) => (
    result.enforced
    && result.decision === 'allow'
    && result.tier === 'clinic_ai'
    && result.lifecycle === 'ACTIVE'
    && result.sourceKind === 'founder_canary_preview_store'
  ))

  const foodScanPolicy = usagePolicyForEntitlementTier('clinic_ai', 'food_scan')
  const safetyNetPresent = actor.shadowPilotFeatures !== null
  const pass = allClinicAi
    && safetyNetPresent
    && foodScanPolicy.dailyLimit === 3
    && foodScanPolicy.monthlyLimit === 90

  return (
    <main style={{ minHeight: '100vh', background: '#101010', color: '#eee', padding: 32, fontFamily: 'system-ui' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <p style={{ color: '#d5b34c', letterSpacing: 1.5, textTransform: 'uppercase' }}>
          MYAQ-ENT-P5 / Founder real-user Preview only
        </p>
        <h1>P5 Founder Real-User Canary</h1>
        <p style={{ fontSize: 22, fontWeight: 700 }}>{pass ? 'PASS — READY FOR LIVE FEATURE CANARY' : 'REVIEW REQUIRED'}</p>
        <p>
          This page does not modify your clinical history, billing, Square, Production, or internal-pilot enrollment.
          The P5 entitlement uses a synthetic Preview lifecycle anchor solely to exercise the clinic_ai experience.
        </p>

        <section style={cardStyle()}>
          <h2>Safety isolation</h2>
          <p>Environment: <strong>Preview / P5 branch</strong></p>
          <p>Founder patient binding: <strong>{actor.boundPatientId ? 'MATCHED' : 'UNRESOLVED'}</strong></p>
          <p>Internal pilot safety net: <strong>{safetyNetPresent ? 'PRESENT' : 'MISSING'}</strong></p>
          <p>P5 effective tier: <strong>{allClinicAi ? 'clinic_ai' : 'REVIEW'}</strong></p>
          <p>Food Scan policy: <strong>{foodScanPolicy.dailyLimit}/day · {foodScanPolicy.monthlyLimit}/month</strong></p>
        </section>

        {results.map(({ label, capability, result }) => (
          <section style={cardStyle()} key={capability}>
            <h2>{label}</h2>
            <p>Capability: <strong>{capability}</strong></p>
            <p>Enforced: <strong>{result.enforced ? 'YES' : 'NO'}</strong></p>
            <p>Decision: <strong>{result.enforced ? result.decision : result.reason}</strong></p>
            {result.enforced && (
              <>
                <p>Tier: <strong>{result.tier ?? 'NONE'}</strong></p>
                <p>Lifecycle: <strong>{result.lifecycle}</strong></p>
                <p>Reason: <strong>{result.reason}</strong></p>
                <p>Source: <strong>{result.sourceKind}</strong></p>
              </>
            )}
          </section>
        ))}
      </div>
    </main>
  )
}
