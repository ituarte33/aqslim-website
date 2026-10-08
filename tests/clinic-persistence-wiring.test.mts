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

test('Clinic date inputs expose stable labels and capture input events', async () => {
  const preview = await readFile(new URL('../app/clinic-preview/clinic-preview-client.tsx', import.meta.url), 'utf8')
  const plan = await readFile(new URL('../app/clinic-plan-compatibility.tsx', import.meta.url), 'utf8')
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
