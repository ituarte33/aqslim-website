import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('Clinic note writes validate dates and verify the saved Airtable record', async () => {
  const source = await readFile(new URL('../app/api/preview/clinic-notes/route.ts', import.meta.url), 'utf8')
  assert.match(source, /normalizeClinicIsoDate\(rawFollowupDate\)/)
  assert.match(source, /returnFieldsByFieldId=true/)
  assert.match(source, /clinic_notes_verify_failed/)
})

test('Clinic plan writes verify the exact saved Airtable record', async () => {
  const source = await readFile(new URL('../app/api/preview/clinic-plans/route.ts', import.meta.url), 'utf8')
  assert.match(source, /returnFieldsByFieldId=true/)
  assert.match(source, /clinic_plan_verify_failed/)
  assert.match(source, /identity_mismatch/)
})

test('Clinic plan publication is founder-only, double-confirmed, and verified against My AQSLIM', async () => {
  const route = await readFile(new URL('../app/api/preview/clinic-plans/route.ts', import.meta.url), 'utf8')
  const plan = await readFile(new URL('../app/clinic-plan-compatibility.tsx', import.meta.url), 'utf8')
  assert.match(route, /export async function PUT/)
  assert.match(route, /await requireFounder\(\)/)
  assert.match(route, /confirmation !== 'PUBLICAR PLAN PREVIEW'/)
  assert.match(route, /draft\.status !== 'Ready for Review'/)
  assert.match(route, /publishedPlanMatches\(draft, verifiedLivePlan\)/)
  assert.match(route, /clinic_plan_publication_verify_failed/)
  assert.match(route, /auditReadbackResponse/)
  assert.match(route, /reason: 'readback_failed'/)
  assert.match(plan, /Revisar publicación en My AQSLIM/)
  assert.match(plan, /Confirmar publicación/)
  assert.match(plan, /publishGuard\.current/)
  assert.match(plan, /publishedPlansMatch\(intendedPlan, verifiedLivePlan\)/)
  assert.match(plan, /Plan publicado y verificado en My AQSLIM/)
})

test('Clinic date inputs expose stable labels and capture input events', async () => {
  const preview = await readFile(new URL('../app/clinic-preview/clinic-preview-client.tsx', import.meta.url), 'utf8')
  const plan = await readFile(new URL('../app/clinic-plan-compatibility.tsx', import.meta.url), 'utf8')
  assert.match(preview, /aria-label="Fecha de consulta"[^>]+onInput=/)
  assert.match(preview, /aria-label="Fecha de seguimiento de la nota"[^>]+onInput=/)
  assert.match(preview, /aria-label="Fecha objetivo del seguimiento"[^>]+onInput=/)
  assert.match(plan, /aria-label="Inicio tratamiento"[^>]+onInput=/)
  assert.match(plan, /plansMatch\(intendedDraft/)
})

test('Clinic weight replies are validated and verified without becoming visits', async () => {
  const route = await readFile(new URL('../app/api/preview/clinic-consultations/route.ts', import.meta.url), 'utf8')
  const preview = await readFile(new URL('../app/clinic-preview/clinic-preview-client.tsx', import.meta.url), 'utf8')
  assert.match(route, /normalizeClinicWeightEntry\(body\.weight, body\.weightUnit\)/)
  assert.match(route, /returnFieldsByFieldId=true/)
  assert.match(route, /CLINIC_WEIGHT_UPDATE_TYPE/)
  assert.match(route, /verificationResponse/)
  assert.match(route, /selectName\(savedFields\[F\.WEIGHT_UNIT\]\)/)
  assert.match(preview, /Registrar peso recibido/)
  assert.match(preview, /clinicWeightEntryMatches\(item, intended\)/)
})

test('the latest verified weight stays an explicit suggestion for consultation and plan forms', async () => {
  const preview = await readFile(new URL('../app/clinic-preview/clinic-preview-client.tsx', import.meta.url), 'utf8')
  const plan = await readFile(new URL('../app/clinic-plan-compatibility.tsx', import.meta.url), 'utf8')
  const route = await readFile(new URL('../app/api/preview/clinic-plans/route.ts', import.meta.url), 'utf8')
  assert.match(preview, /Usar en esta consulta/)
  assert.match(preview, /La consulta todavía no se ha guardado/)
  assert.match(plan, /Usar como peso actual/)
  assert.match(plan, /no cambia el borrador hasta que la uses/)
  assert.match(route, /Promise\.all/)
  assert.match(route, /getLatestWeightSuggestion\(patient\.id\)/)
})

test('Clinic plan workspace canonicalizes legacy phases before showing or copying them', async () => {
  const plan = await readFile(new URL('../app/clinic-plan-compatibility.tsx', import.meta.url), 'utf8')
  assert.match(plan, /toCanonicalPhaseName/)
  assert.match(plan, /canonicalPhase && CLINIC_PHASES\.has\(canonicalPhase\) \? canonicalPhase : 'Sin fase'/)
  assert.match(plan, /setLivePlan\(data\.livePlan \? normalizePlan\(data\.livePlan\) : null\)/)
})

test('follow-up quick actions navigate to every implemented Clinic workspace', async () => {
  const preview = await readFile(new URL('../app/clinic-preview/clinic-preview-client.tsx', import.meta.url), 'utf8')
  assert.match(preview, /function openPlan\(\)[\s\S]*?textContent\?\.trim\(\) === 'Plan'[\s\S]*?planButton\?\.click\(\)/)
  assert.match(preview, /function openMyAqslim\(\).*setActiveTab\('My AQSLIM'\)/)
  assert.match(preview, /function openMessages\(\).*setActiveTab\('Mensajes'\)/)
  assert.match(preview, /Continuar en el expediente/)
  assert.match(preview, /onClick=\{openPlan\}[^>]*>Crear o actualizar plan →/)
  assert.match(preview, /onClick=\{openMyAqslim\}[^>]*>Revisar My AQSLIM →/)
  assert.match(preview, /onClick=\{openMessages\}[^>]*>Ver mensajes →/)
  assert.match(preview, /no guardan, publican ni envían información/)
  assert.doesNotMatch(preview, /siguiente paso/)
})

test('consultation review mirrors the Preview payload before saving', async () => {
  const preview = await readFile(new URL('../app/clinic-preview/clinic-preview-client.tsx', import.meta.url), 'utf8')
  assert.match(preview, /Revisión antes de guardar/)
  assert.match(preview, /Esto es exactamente lo que se enviará al expediente de Clinic Preview/)
  assert.match(preview, /Sin mediciones ingresadas/)
  assert.match(preview, /Sin recomendaciones ingresadas/)
  assert.match(preview, /La cita seguirá siendo preliminar hasta confirmarla por separado en Square/)
  assert.match(preview, /Guardar consulta Preview/)
})

test('consultation submission has a synchronous duplicate-save guard', async () => {
  const preview = await readFile(new URL('../app/clinic-preview/clinic-preview-client.tsx', import.meta.url), 'utf8')
  assert.match(preview, /if \(!beginClinicSubmit\(consultationSubmitGuard\.current\)\) return/)
  assert.match(preview, /finishClinicSubmit\(consultationSubmitGuard\.current\)/)
  assert.match(preview, /aria-busy=\{consultationSaving\}/)
  assert.match(preview, /Protección contra doble guardado activa/)
})

test('consultation readiness blocks invalid dates and payment amounts before persistence', async () => {
  const preview = await readFile(new URL('../app/clinic-preview/clinic-preview-client.tsx', import.meta.url), 'utf8')
  const route = await readFile(new URL('../app/api/preview/clinic-consultations/route.ts', import.meta.url), 'utf8')
  assert.match(preview, /Lista para guardar/)
  assert.match(preview, /Las mediciones, recomendaciones y próxima cita pueden quedar vacías/)
  assert.match(preview, /disabled=\{consultationSaving \|\| !consultationReadiness\.ready\}/)
  assert.match(route, /normalizeClinicIsoDate\(body\.consultationDate\)/)
  assert.match(route, /error: 'invalid_payment'/)
})

test('Clinic Preview consultation workspace has responsive mobile breakpoints', async () => {
  const preview = await readFile(new URL('../app/clinic-preview/clinic-preview-client.tsx', import.meta.url), 'utf8')
  const globalStyles = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8')
  assert.match(preview, /className="clinic-preview-shell"/)
  assert.match(preview, /className="clinic-preview-consultations-grid"/)
  assert.match(preview, /className="clinic-preview-review-grid"/)
  assert.match(preview, /className="clinic-preview-readiness-grid"/)
  assert.match(preview, /className="clinic-preview-header" style=\{\{ position: 'relative'/)
  assert.doesNotMatch(preview, /className="clinic-preview-header" style=\{\{ position: 'sticky'/)
  assert.match(globalStyles, /\.clinic-preview-tabs \{[\s\S]*?position: static;[\s\S]*?inset: auto;[\s\S]*?z-index: auto;/)
  assert.match(globalStyles, /@media \(max-width: 860px\)[\s\S]*?\.clinic-preview-header \{[\s\S]*?position: static !important;/)
  assert.match(globalStyles, /@media \(max-width: 860px\)[\s\S]*?\.clinic-preview-shell \{ grid-template-columns: minmax\(0, 1fr\) !important; \}/)
  assert.match(globalStyles, /@media \(max-width: 560px\)[\s\S]*?\.clinic-preview-review-grid,[\s\S]*?\.clinic-preview-readiness-grid \{ grid-template-columns: minmax\(0, 1fr\) !important; \}/)
})

test('Clinic Preview restores the selected patient after returning from My AQSLIM', async () => {
  const page = await readFile(new URL('../app/clinic-preview/page.tsx', import.meta.url), 'utf8')
  const preview = await readFile(new URL('../app/clinic-preview/clinic-preview-client.tsx', import.meta.url), 'utf8')
  assert.match(page, /const requestedPatient = \(await searchParams\)\.patient/)
  assert.match(page, /items\.some\(patient => patient\.id === requestedPatientId\)/)
  assert.match(page, /initialPatientId=\{initialPatientId\}/)
  assert.match(preview, /useState<string \| null>\(initialPatientId\)/)
  assert.match(preview, /clinicUrl\.searchParams\.set\('patient', id\)/)
  assert.match(preview, /window\.history\.replaceState\(window\.history\.state/)
})

test('Clinic and patient credentials land in their separate applications', async () => {
  const middleware = await readFile(new URL('../middleware.ts', import.meta.url), 'utf8')
  const clinicPage = await readFile(new URL('../app/clinic-preview/page.tsx', import.meta.url), 'utf8')
  const clinicLogin = await readFile(new URL('../app/clinic-preview/login/[[...login]]/page.tsx', import.meta.url), 'utf8')
  const patientLogin = await readFile(new URL('../app/my-aqslim/login/[[...login]]/login-view.tsx', import.meta.url), 'utf8')

  assert.match(middleware, /'\/clinic-preview\/login\(\.\*\)'/)
  assert.match(middleware, /isClinicPreviewRoute\(req\)[\s\S]*?new URL\('\/clinic-preview\/login'/)
  assert.match(clinicPage, /if \(!actor\) redirect\('\/clinic-preview\/login'\)/)
  assert.match(clinicLogin, /forceRedirectUrl="\/clinic-preview"/)
  assert.match(clinicLogin, /isClinicPreviewEnvironment/)
  assert.match(patientLogin, /forceRedirectUrl="\/my-aqslim\/welcome"/)
})

test('Clinic entry is isolated from the global language gate', async () => {
  const languageModal = await readFile(new URL('../app/language-modal.tsx', import.meta.url), 'utf8')

  assert.match(languageModal, /pathname\.startsWith\('\/clinic-preview'\)/)
  assert.match(languageModal, /if \(hasDedicatedEntry\) return/)
  assert.match(languageModal, /if \(!visible \|\| hasDedicatedEntry\) return null/)
})
