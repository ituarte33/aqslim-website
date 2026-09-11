import { currentUser } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { saveConsultaSubsecuente } from '@/app/dashboard/consulta-subsecuente/actions'
import { getLinkedClinicConsultationsByPatientId } from '@/lib/clinic-consultation-source'
import { pendingPatientSubjectId } from '@/lib/p4-provisioning-policy'
import { getPreviewEntitlementSourceRecordByPatientRecordId } from '@/lib/preview-entitlement-store'
import { ENTITLEMENT_P4_PREVIEW_BRANCH } from '@/lib/nutrition/synthetic-preview-policy'

export const dynamic = 'force-dynamic'

const FOUNDER_EMAIL = 'rom@ituarteconsulting.com'
const CANARY_PATIENT_RECORD_ID = 'rec8xIB7hf1XzLucs'
const CANARY_PATH = '/my-aqslim/pilot/p4-provisioning-canary'

const SCENARIOS = {
  new: { visitType: 'Cliente Nuevo', visitDate: '2026-09-11' },
  subsequent: { visitType: 'Cliente subsecuente', visitDate: '2026-09-12' },
  supplement: { visitType: 'Suplementos', visitDate: '2026-09-13' },
} as const

type ScenarioKey = keyof typeof SCENARIOS

function primaryEmail(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>): string | null {
  const selected = user.primaryEmailAddressId
    ? user.emailAddresses.find(address => address.id === user.primaryEmailAddressId)
    : user.emailAddresses[0]
  return selected?.emailAddress?.trim().toLowerCase() || null
}

function assertP4Preview() {
  if (
    process.env.VERCEL_ENV !== 'preview'
    || process.env.VERCEL_GIT_COMMIT_REF !== ENTITLEMENT_P4_PREVIEW_BRANCH
  ) redirect('/my-aqslim')
}

async function runP4CanaryScenario(formData: FormData) {
  'use server'
  assertP4Preview()
  const user = await currentUser()
  if (!user || primaryEmail(user) !== FOUNDER_EMAIL) redirect('/my-aqslim')

  const scenarioKey = String(formData.get('scenario') ?? '') as ScenarioKey
  const scenario = SCENARIOS[scenarioKey]
  if (!scenario) throw new Error('Invalid P4 canary scenario')

  const existingConsultations = await getLinkedClinicConsultationsByPatientId(CANARY_PATIENT_RECORD_ID)
  const alreadyExists = existingConsultations.some(consultation => (
    consultation.fields['Fecha Consulta'] === scenario.visitDate
    && consultation.fields['Tipo de Consulta'] === scenario.visitType
  ))
  if (alreadyExists) {
    revalidatePath(CANARY_PATH)
    return
  }

  const payload = new FormData()
  payload.set('clienteRecordId', CANARY_PATIENT_RECORD_ID)
  payload.set('fechaConsulta', scenario.visitDate)
  payload.set('tipoConsulta', scenario.visitType)
  payload.set('notasSuplemento', `SYNTHETIC PREVIEW-ONLY MYAQ P4 canary: ${scenarioKey}`)

  await saveConsultaSubsecuente(payload)
  revalidatePath(CANARY_PATH)
}

function cardStyle(): React.CSSProperties {
  return {
    border: '1px solid #444',
    padding: 20,
    marginTop: 18,
    background: '#151515',
  }
}

export default async function P4ProvisioningCanaryPage() {
  assertP4Preview()
  const user = await currentUser()
  if (!user || primaryEmail(user) !== FOUNDER_EMAIL) redirect('/my-aqslim')

  const consultations = await getLinkedClinicConsultationsByPatientId(CANARY_PATIENT_RECORD_ID)
  const entitlement = await getPreviewEntitlementSourceRecordByPatientRecordId({
    patientRecordId: CANARY_PATIENT_RECORD_ID,
    canonicalSubjectId: pendingPatientSubjectId(CANARY_PATIENT_RECORD_ID),
  })

  const hasScenario = (key: ScenarioKey) => {
    const scenario = SCENARIOS[key]
    return consultations.some(consultation => (
      consultation.fields['Fecha Consulta'] === scenario.visitDate
      && consultation.fields['Tipo de Consulta'] === scenario.visitType
    ))
  }

  const newDone = hasScenario('new')
  const subsequentDone = hasScenario('subsequent')
  const supplementDone = hasScenario('supplement')

  const record = entitlement?.record ?? null
  const newPass = !newDone || Boolean(
    record
    && record.tier === 'clinic_ai'
    && record.status === 'trial'
    && record.source === 'clinic_ai_trial'
    && record.trialStarts === '2026-09-11T00:00:00.000Z'
    && record.trialEnds === '2026-10-11T00:00:00.000Z'
  )
  const subsequentPass = !subsequentDone || Boolean(
    record
    && record.trialStarts === '2026-09-11T00:00:00.000Z'
    && record.trialEnds === '2026-10-11T00:00:00.000Z'
    && record.lastCompletedVisit === '2026-09-12'
  )
  const supplementPass = !supplementDone || Boolean(
    record
    && record.trialStarts === '2026-09-11T00:00:00.000Z'
    && record.trialEnds === '2026-10-11T00:00:00.000Z'
    && record.lastCompletedVisit === '2026-09-12'
  )

  const allDone = newDone && subsequentDone && supplementDone
  const allPass = allDone && newPass && subsequentPass && supplementPass

  return (
    <main style={{ minHeight: '100vh', background: '#101010', color: '#eee', padding: 32, fontFamily: 'system-ui' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <p style={{ color: '#d5b34c', letterSpacing: 1.5, textTransform: 'uppercase' }}>MYAQ-ENT-P4 / Preview only</p>
        <h1>P4 Provisioning Canary</h1>
        <p style={{ fontSize: 22, fontWeight: 700 }}>
          {allPass ? 'PASS' : allDone ? 'REVIEW REQUIRED' : 'READY FOR NEXT STEP'}
        </p>
        <p>
          Synthetic patient only. Each button uses the real consultation save action. No billing,
          Square, Production, or real-user entitlement is modified.
        </p>

        <section style={cardStyle()}>
          <h2>Current Preview entitlement</h2>
          <p>Patient: <strong>{CANARY_PATIENT_RECORD_ID}</strong></p>
          <p>Stored subject: <strong>{entitlement?.storedSubjectId ?? 'NONE'}</strong></p>
          <p>Tier: <strong>{record?.tier ?? 'NONE'}</strong></p>
          <p>Status: <strong>{record?.status ?? 'NONE'}</strong></p>
          <p>Source: <strong>{record?.source ?? 'NONE'}</strong></p>
          <p>Trial: <strong>{record?.trialStarts ?? '—'} → {record?.trialEnds ?? '—'}</strong></p>
          <p>Last completed visit snapshot: <strong>{record?.lastCompletedVisit ?? '—'}</strong></p>
        </section>

        <section style={cardStyle()}>
          <h2>1. Cliente Nuevo → clinic_ai trial</h2>
          <p>Expected: create trial 2026-09-11 → 2026-10-11.</p>
          <p>Status: <strong>{newDone ? (newPass ? 'PASS' : 'FAIL') : 'NOT RUN'}</strong></p>
          <form action={runP4CanaryScenario}>
            <input type="hidden" name="scenario" value="new" />
            <button type="submit" disabled={newDone}>Run Cliente Nuevo</button>
          </form>
        </section>

        <section style={cardStyle()}>
          <h2>2. Cliente subsecuente → lifecycle refresh only</h2>
          <p>Expected: keep original trial dates; snapshot advances to 2026-09-12.</p>
          <p>Status: <strong>{subsequentDone ? (subsequentPass ? 'PASS' : 'FAIL') : 'NOT RUN'}</strong></p>
          <form action={runP4CanaryScenario}>
            <input type="hidden" name="scenario" value="subsequent" />
            <button type="submit" disabled={!newDone || subsequentDone}>Run Cliente subsecuente</button>
          </form>
        </section>

        <section style={cardStyle()}>
          <h2>3. Suplementos → no entitlement write</h2>
          <p>Expected: trial and last qualifying visit snapshot remain unchanged.</p>
          <p>Status: <strong>{supplementDone ? (supplementPass ? 'PASS' : 'FAIL') : 'NOT RUN'}</strong></p>
          <form action={runP4CanaryScenario}>
            <input type="hidden" name="scenario" value="supplement" />
            <button type="submit" disabled={!subsequentDone || supplementDone}>Run Suplementos</button>
          </form>
        </section>

        <section style={cardStyle()}>
          <h2>Consultations observed</h2>
          {consultations.length === 0 ? <p>None yet.</p> : (
            <ul>
              {consultations.map(consultation => (
                <li key={consultation.id}>
                  {consultation.fields['Fecha Consulta'] ?? '—'} · {consultation.fields['Tipo de Consulta'] ?? '—'} · {consultation.id}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}
