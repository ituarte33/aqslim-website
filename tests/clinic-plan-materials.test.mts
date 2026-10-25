import test from 'node:test'
import assert from 'node:assert/strict'
import { materialPlanRevision, currentPlanAttachments, decodeClinicMaterialEvent, activePlanIncludesFast36, type ClinicMaterialEvent } from '../lib/clinic-plan-materials.ts'
const attachment = { id: 'attOriginal', filename: 'old_hipocaloric.pdf', url: 'https://example.test/old.pdf' }
const plan = { id: 'recPlan1234567890', fields: { 'Notas del Plan': 'FAST 36 + Hipocalórico', 'Dieta en Nutrimind': 'Hipocalórico', 'Fase Actual': 'Jing', 'Fecha Inicio Fase Actual': '2026-09-17', 'Materiales asignados': [attachment] } }
const release: ClinicMaterialEvent = { kind: 'clinic-plan-materials-v1', action: 'release', planId: plan.id, revision: materialPlanRevision(plan), at: '2026-10-24T17:00:00Z', label: 'Plan', attachments: [attachment] }
test('unversioned old files are withheld without deleting their Clinic copy', () => {
 assert.deepEqual(currentPlanAttachments(plan, []), [])
 assert.equal(plan.fields['Materiales asignados'][0], attachment)
 assert.equal(decodeClinicMaterialEvent('ordinary note'), null)
})
test('only explicit current-plan releases expose an attachment', () => {
 assert.deepEqual(currentPlanAttachments(plan, [release]), [attachment])
 assert.deepEqual(currentPlanAttachments(plan, [{...release, planId:'anotherPlan'}]), [])
 assert.deepEqual(currentPlanAttachments(plan, [{...release, action:'archive'}]), [])
})
test('any phase or diet transition invalidates the previous release, including Jing to Qi and same-phase plans', () => {
 for(const fields of [ {'Fase Actual':'Qi'}, {'Dieta en Nutrimind':'Plan Jing'}, {'Fecha Inicio Fase Actual':'2026-10-23'}, {'Notas del Plan':'New plan'}, {'Instrucciones Especiales':'Sin FAST 36'}, {'Calorías Objetivo':1400} ]) {
  assert.deepEqual(currentPlanAttachments({...plan, fields:{...plan.fields,...fields}},[release]),[])
 }
 assert.equal(activePlanIncludesFast36({...plan, fields:{...plan.fields, 'Notas del Plan':'Jing · 6 semanas', 'Dieta en Nutrimind':'Plan Jing'}}),false)
})
test('weight and week changes do not unnecessarily invalidate assignments', () => {
 assert.deepEqual(currentPlanAttachments({...plan,fields:{...plan.fields,'Semana en Fase Actual':2,'Peso Actual (kg)':100}},[release]),[attachment])
})
test('latest revocation wins; restoring an old plan cannot revive an older release', () => {
 const revoke = {...release, at:'2026-10-24T18:00:00Z', attachments:[]}
 assert.deepEqual(currentPlanAttachments(plan, [release,revoke]),[])
 const archived = {...release, action:'archive' as const, at:'2026-10-24T18:30:00Z'}
 assert.deepEqual(currentPlanAttachments(plan, [release,archived]),[])
 const other = {...release, at:'2026-10-24T19:00:00Z',revision:'new-plan'}
 assert.deepEqual(currentPlanAttachments(plan, [release,other]),[])
})
test('current source URLs are used and removed attachments cannot be resurrected', () => {
 const updated={...attachment,url:'https://example.test/refreshed.pdf'}
 assert.equal(currentPlanAttachments({...plan,fields:{...plan.fields,'Materiales asignados':[updated]}},[release])[0].url,updated.url)
 assert.deepEqual(currentPlanAttachments({...plan,fields:{...plan.fields,'Materiales asignados':[]}},[release]),[])
})
test('FAST 36 requires the current plan; session history alone never enables it', () => {
 assert.equal(activePlanIncludesFast36(plan),true)
 assert.equal(activePlanIncludesFast36(null),false)
 for (const instructions of ['Sin FAST 36 durante este periodo','No FAST 36','without FAST 36']) assert.equal(activePlanIncludesFast36({...plan,fields:{...plan.fields,'Instrucciones Especiales':instructions}}),false)
})
test('structured history preserves the original plan and rejects malformed links',()=>{
 const archive={...release, action:'archive',planFields:plan.fields}
 assert.deepEqual(decodeClinicMaterialEvent(JSON.stringify(archive)),archive)
 assert.equal(decodeClinicMaterialEvent(JSON.stringify({...release,attachments:[{...attachment,url:'javascript:bad'}]})),null)
})
