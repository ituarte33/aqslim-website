import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'
import { createHash } from 'node:crypto'
import { planClinicAccessRenewal } from '../lib/clinic-access-renewal-policy.ts'
import { createCanonicalEntitlementRecord } from '../lib/entitlement-record.ts'
import { patientIsUnavailable, administeredNotes } from '../lib/clinic-patient-administration-policy.ts'
import type { LinkedClinicConsultation } from '../lib/clinic-consultation-source.ts'
import * as publication from '../lib/clinic-consultation-publication.ts'
import { normalizeClinicIsoDate } from '../lib/clinic-date.ts'
const patientId='rec12345678901234',visitId='rec22345678901234',otherId='rec33333333333333',accessId='rec44444444444444'
const now=new Date('2026-10-27T17:00:00Z')
function basic(){return createCanonicalEntitlementRecord({subjectId:'user_synthetic',tier:'portal_basic',status:'active',source:'clinic_visit',trialStarts:null,trialEnds:null,paidThrough:null,lastCompletedVisit:'2026-10-20',graceEnds:null,accessExpires:null,squareSubscriptionId:null,entitlementReason:'Synthetic onboarding',lastAccessChange:'2026-10-20T00:00:00Z',override:null,overrideReason:null})}
function visit(type='Cliente Re-Inicio',date='2026-10-20',id=visitId):LinkedClinicConsultation{return{id,fields:{'ID Cliente':[patientId],'Fecha Consulta':date,'Tipo de Consulta':type}}}
function evidence(){return{patientId,consultationId:visitId,visits:[visit()],record:basic(),isOperational:true,patientAvailable:true,today:'2026-10-27'}}
async function load(file:string,mocks:Record<string,unknown>,extra={},suffix=''){
  const source=await readFile(new URL(file,import.meta.url),'utf8')
  const code=ts.transpileModule(source+suffix,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  const exports:Record<string,any>={}
  vm.runInNewContext(code,{exports,require:(id:string)=>{assert.ok(id in mocks,`Missing mock ${id}`);return mocks[id]},Date,JSON,Intl,Error,URL,URLSearchParams,Response,...extra})
  return exports
}
test('new and restart access uses original visit dates without payment or override changes',()=>{
  for(const type of ['Cliente Nuevo','Cliente Re-Inicio']){
    const plan=planClinicAccessRenewal({...evidence(),visits:[visit(type)]})
    assert.equal(plan.state,'update');assert.equal(plan.changes.tier,'clinic_ai');assert.equal(plan.changes.status,'trial')
    assert.equal(plan.trialStarts,'2026-10-20T00:00:00.000Z');assert.equal(plan.trialEnds,'2026-11-19T00:00:00.000Z')
    assert.ok(!('paidThrough' in plan.changes));assert.ok(!('override' in plan.changes))
  }
})
test('subsequent visits refresh lifecycle without creating or renewing a trial',()=>{
  const plan=planClinicAccessRenewal({...evidence(),visits:[visit('Cliente Nuevo','2026-10-01',otherId),visit('Cliente subsecuente')]})
  assert.equal(plan.state,'update');assert.equal(plan.changes.lastCompletedVisit,'2026-10-20')
  assert.equal(plan.changes.trialStarts,undefined);assert.equal(plan.changes.trialEnds,undefined);assert.equal(plan.changes.tier,undefined)
})
test('historical publication retry cannot move a newer trial backwards or extend from today',()=>{
  const record={...basic(),tier:'clinic_ai' as const,status:'trial' as const,source:'clinic_ai_trial' as const,trialStarts:'2026-10-25T00:00:00.000Z',trialEnds:'2026-11-24T00:00:00.000Z'}
  const plan=planClinicAccessRenewal({...evidence(),record})
  assert.equal(plan.changes.trialStarts,undefined);assert.equal(plan.trialEnds,record.trialEnds)
  assert.equal(planClinicAccessRenewal({...evidence(),record:{...record,entitlementReason:`MYAQ_CLINIC_ACCESS_VISIT:${visitId}; actor=synthetic`}}).state,'unchanged')
})
test('manual restrictions, expiry, pilot, paid and administrative grants are preserved',()=>{
  const records=[{...basic(),status:'suspended' as const},{...basic(),status:'expired' as const},{...basic(),status:'canceled' as const},
    {...basic(),override:'deny' as const,overrideReason:'Manual'},{...basic(),override:'allow' as const,overrideReason:'Manual'},
    {...basic(),tier:'internal_pilot' as const},{...basic(),tier:'kenkho_plus' as const},
    {...basic(),source:'clinic_ai_paid' as const},{...basic(),source:'administrative' as const},
    {...basic(),paidThrough:'2026-12-01'},{...basic(),accessExpires:'2026-11-01T00:00:00Z'},{...basic(),squareSubscriptionId:'synthetic-subscription'}]
  for(const record of records){const plan=planClinicAccessRenewal({...evidence(),record});assert.equal(plan.state,'preserved');assert.deepEqual(plan.changes,{})}
  assert.equal(planClinicAccessRenewal({...evidence(),isOperational:false}).state,'preserved')
})
test('unknown access requires onboarding; archive, wrong patient, weight-only and invalid dates block renewal',()=>{
  assert.equal(planClinicAccessRenewal({...evidence(),record:null}).state,'onboarding_required')
  assert.equal(planClinicAccessRenewal({...evidence(),patientAvailable:false}).state,'blocked')
  for(const visits of [[],[visit('Actualización de peso')],[{...visit(),fields:{...visit().fields,'ID Cliente':[otherId]}}],[visit('Cliente Nuevo','2026-10-28')],[visit('Cliente Nuevo','2026-02-30')]])assert.equal(planClinicAccessRenewal({...evidence(),visits}).state,'blocked')
})
async function harness(){
  let mode='production',record=basic(),writes=0,providerError=false,corrupt=false,notes='',visits=[visit()],missing=false,changed=false,reads=0
  const names=['TIER','STATUS','SOURCE','TRIAL_STARTS','TRIAL_ENDS','LAST_COMPLETED_VISIT','GRACE_ENDS','REASON','LAST_ACCESS_CHANGE','PATIENT_RECORD_ID','SUBJECT_ID','PREVIEW_ONLY']
  const F=Object.fromEntries(names.map(n=>[n,n]))
  const keys:Record<string,string>={TIER:'tier',STATUS:'status',SOURCE:'source',TRIAL_STARTS:'trialStarts',TRIAL_ENDS:'trialEnds',LAST_COMPLETED_VISIT:'lastCompletedVisit',GRACE_ENDS:'graceEnds',REASON:'entitlementReason',LAST_ACCESS_CHANGE:'lastAccessChange'}
  const persisted:any={id:accessId,fields:{PATIENT_RECORD_ID:patientId,SUBJECT_ID:'user_synthetic',PREVIEW_ONLY:false}}
  const service=await load('../lib/clinic-access-renewal.ts',{
    'server-only':{},'node:crypto':{createHash},'./airtable':{getClienteById:async()=>({id:patientId,fields:{'Notas Generales':notes}})},
    './clinic-runtime-policy':{clinicRuntimeMode:()=>mode,clinicWritesPaused:()=>false,assertClinicSourceWriteAllowed:()=>{}},'./clinic-preview-policy':{CLINIC_FOUNDER_EMAIL:'founder@example.test'},
    './nutrition/synthetic-preview-policy':{SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID:'synthetic-base'},
    './clinic-patient-administration-policy':{patientIsUnavailable},'./clinic-consultation-source':{getLinkedClinicConsultationsByPatientId:async()=>visits},
    './clinic-access-renewal-policy':{planClinicAccessRenewal},'./preview-entitlement-store':{PREVIEW_ENTITLEMENT_FIELDS:F,PREVIEW_ENTITLEMENTS_TABLE:'synthetic-access',getPortalAccessRecordByPatientRecordId:async()=>{
      reads++;if(providerError)throw new Error('Synthetic provider error')
      if(changed&&reads>1)record={...record,override:'deny',overrideReason:'New restriction'}
      return missing?null:{airtableRecordId:accessId,storedSubjectId:'user_synthetic',patientRecordId:patientId,isOperational:true,record:{...record}}
    }},
  },{process:{env:{AIRTABLE_BASE_ID:'synthetic-base',AIRTABLE_PAT:'synthetic-token'}},fetch:async(_url:string,init:any)=>{
    if(init.method==='PATCH'){
      writes++;const patch=JSON.parse(init.body).fields
      for(const protectedField of ['PAID_THROUGH','SQUARE_SUBSCRIPTION_ID','OVERRIDE','OVERRIDE_REASON','PATIENT_RECORD_ID','SUBJECT_ID','PREVIEW_ONLY'])assert.ok(!(protectedField in patch))
      Object.assign(persisted.fields,patch)
      for(const [id,value]of Object.entries(patch))if(keys[id])record={...record,[keys[id]]:value}
      return new Response('{}',{status:200})
    }
    return new Response(JSON.stringify(corrupt?{...persisted,fields:{...persisted.fields,STATUS:'wrong'}}:persisted),{status:200})
  }})
  const input=(fingerprint?:string)=>({patientId,consultationId:visitId,actorEmail:'founder@example.test',now,fingerprint})
  return{service,input,record:()=>record,writes:()=>writes,mode:(v:string)=>{mode=v},protect:()=>{record={...record,override:'deny',overrideReason:'Manual restriction'}},missing:()=>{missing=true},down:()=>{providerError=true},corrupt:()=>{corrupt=true},changed:()=>{changed=true},archive:()=>{notes=administeredNotes('','archived',{action:'archive',at:now.toISOString(),actor:'synthetic',reason:'Synthetic archive'})},weightOnly:()=>{visits=[visit('Actualización de peso')]}}
}
test('production renewal patches only existing operational access, verifies readback and is idempotent',async()=>{
  const h=await harness(),snapshot=await h.service.reviewClinicAccessRenewal(h.input())
  assert.equal(h.writes(),0)
  const result=await h.service.executeClinicAccessRenewal(h.input(snapshot.review.fingerprint))
  assert.equal(result.verified,true);assert.equal(result.state,'updated');assert.equal(h.writes(),1)
  assert.equal(h.record().trialStarts,'2026-10-20T00:00:00.000Z');assert.equal(h.record().trialEnds,'2026-11-19T00:00:00.000Z')
  assert.equal((await h.service.executeClinicAccessRenewal(h.input())).state,'unchanged');assert.equal(h.writes(),1)
})
test('candidate, disabled, wrong actor and stale review reject before any write',async()=>{
  const h=await harness()
  for(const mode of ['candidate','preview','disabled']){h.mode(mode);await assert.rejects(h.service.executeClinicAccessRenewal(h.input()),/READ_ONLY/)}
  h.mode('production');await assert.rejects(h.service.executeClinicAccessRenewal({...h.input(),actorEmail:'someoneelse@example.test'}),/FORBIDDEN/)
  await assert.rejects(h.service.executeClinicAccessRenewal(h.input('stale')),/REVIEW_CHANGED/);assert.equal(h.writes(),0)
})
test('no grant never creates one; protected, archived and weight-only patients are not renewed',async()=>{
  const h=await harness();h.missing();assert.equal((await h.service.executeClinicAccessRenewal(h.input())).state,'onboarding_required');assert.equal(h.writes(),0)
  const k=await harness();k.protect();assert.equal((await k.service.executeClinicAccessRenewal(k.input())).state,'preserved');assert.equal(k.writes(),0)
  const m=await harness();m.archive();await assert.rejects(m.service.executeClinicAccessRenewal(m.input()),/BLOCKED/);assert.equal(m.writes(),0)
  const n=await harness();n.weightOnly();await assert.rejects(n.service.executeClinicAccessRenewal(n.input()),/BLOCKED/);assert.equal(n.writes(),0)
})
test('provider failures, new restrictions and corrupt readback cannot report successful renewal',async()=>{
  const h=await harness();h.down();await assert.rejects(h.service.executeClinicAccessRenewal(h.input()),/provider error/);assert.equal(h.writes(),0)
  const k=await harness();k.changed();await assert.rejects(k.service.executeClinicAccessRenewal(k.input()),/REVIEW_CHANGED/);assert.equal(k.writes(),0)
  const m=await harness();m.corrupt();await assert.rejects(m.service.executeClinicAccessRenewal(m.input()),/VERIFY_FAILED/);assert.equal(m.writes(),1)
})
test('recovery route requires Founder, same origin, exact confirmation and enabled production',async()=>{
  const {NextRequest,NextResponse}=await import('next/server');let mode='candidate',actor:any=null,founder=true,writes=0
  const route=await load('../app/api/preview/clinic-consultation-access/route.ts',{
    'next/server':{NextRequest,NextResponse},'@/lib/auth':{getActor:async()=>actor},
    '@/lib/clinic-runtime-policy':{clinicRuntimeEnvironment:()=>({}),clinicRuntimeMode:()=>mode,isClinicRuntimeFounderIdentity:()=>founder},
    '@/lib/clinic-access-renewal':{reviewClinicAccessRenewal:async()=>({review:{state:'update'}}),executeClinicAccessRenewal:async()=>{writes++;return{verified:true}}},
  })
  const req=(origin='https://synthetic.test',confirmation='ACTUALIZAR ACCESO')=>new NextRequest('https://synthetic.test/api/preview/clinic-consultation-access',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({patientId,consultationId:visitId,fingerprint:'review',confirmation})})
  assert.equal((await route.POST(req())).status,401);actor={email:'synthetic'};founder=false;assert.equal((await route.POST(req())).status,403)
  founder=true;assert.equal((await route.POST(req())).status,409);assert.equal(writes,0)
  mode='production';assert.equal((await route.POST(req('https://foreign.test'))).status,403);assert.equal((await route.POST(req(undefined,'wrong'))).status,409)
  const result=await route.POST(req());assert.equal(result.status,200);assert.equal(writes,1);assert.match(result.headers.get('cache-control'),/no-store/)
})
test('live and legacy Preview provisioning dispatch remain separate',async()=>{
  let mode='candidate',live=0,preview=0
  const service=await load('../lib/clinic-access-after-consultation.ts',{
    'server-only':{},'./clinic-runtime-policy':{clinicRuntimeMode:()=>mode,clinicWritesPaused:()=>false,assertClinicSourceWriteAllowed:()=>{}},'./clinic-access-renewal':{executeClinicAccessRenewal:async()=>{live++;return{state:'updated',message:'verified',verified:true}}},
    './p4-preview-entitlement-provisioning':{provisionClinicEntitlementForCompletedVisit:async()=>{preview++;return{action:'none',write:'none',reason:'P4_PROVISIONING_DISABLED'}}},
  })
  const input={patientRecordId:patientId,consultationId:visitId,visitType:'Cliente Nuevo',visitDate:'2026-10-20',actorEmail:'synthetic'}
  await service.updateAccessAfterCompletedConsultation(input);assert.equal(live,0);assert.equal(preview,1)
  mode='production';await service.updateAccessAfterCompletedConsultation(input);assert.equal(live,1);assert.equal(preview,1)
})
async function publicationHarness(){
  const {NextResponse}=await import('next/server');let created=0,syncs=0,failSync=false,recovered:any[]=[],live:any=null
  const previewFields:any={fldn6SMSHrgaU3hho:`live:${patientId}:visit`,fld0XkzcSxuahpefr:patientId,fldPfnVmXSJYFFWc4:false,fldrKPVZUHzJVX2IM:'Cliente Nuevo',fldrvTUQukYeqYtsi:'2026-10-20',fldWZT9PKGJACROwu:200,fldocfmCBmCS0Unis:'lb'}
  const route=await load('../app/api/preview/clinic-consultations/route.ts',{
    'next/server':{NextResponse},'@/lib/clinic-runtime-policy':{clinicRecordFilter:()=>'',clinicRecordKey:(v:any)=>v,clinicRecordInScope:(f:any,id:string)=>f.fld0XkzcSxuahpefr===id,clinicUsesPreviewRecords:()=>false,assertClinicSourceWriteAllowed:()=>{},isClinicRuntimeEnvironment:()=>true,isClinicRuntimeFounderIdentity:()=>true},
    '@/lib/auth':{getActor:async()=>({email:'synthetic'})},'@/lib/airtable':{CLIENTES_FIELDS:{},getConsultaById:async()=>live,getConsultasByPatientId:async()=>recovered,createConsulta:async(fields:any)=>{created++;live={id:visitId,fields};return live}},
    '@/lib/clinic-consultation-publication':publication,'@/lib/clinic-date':{normalizeClinicIsoDate},'@/lib/clinic-weight-entry':{},
    '@/lib/clinic-access-after-consultation':{updateAccessAfterCompletedConsultation:async()=>{syncs++;assert.ok(created||live,'consultation must exist before access update');if(failSync)throw new Error('Synthetic access failure');return{state:'updated',verified:true}}},
    '@/lib/clinic-patient-administration-policy':{patientIsUnavailable},
  },{process:{env:{}},console:{error:()=>{}},fetch:async(_url:string,init:any)=>{
    if(init.method==='PATCH'){Object.assign(previewFields,JSON.parse(init.body).fields);return new Response('{}',{status:200})}
    return new Response(JSON.stringify({id:otherId,fields:previewFields}),{status:200})
  }},'\nexport { publishPreviewConsultation };')
  return{route,input:{patientId,patientName:'Synthetic',previewRecordId:otherId,confirmation:'PUBLICAR CONSULTA',actorEmail:'synthetic'},counts:()=>[created,syncs],fail:()=>{failSync=true},setRecovered:(rows:any[])=>{recovered=rows;live=rows[0]}}
}
test('publication retry updates access without creating a second consultation',async()=>{
  const h=await publicationHarness()
  let data=await (await h.route.publishPreviewConsultation(h.input)).json();assert.equal(data.published,true);assert.equal(data.auditVerified,true);assert.deepEqual(h.counts(),[1,1])
  data=await (await h.route.publishPreviewConsultation(h.input)).json();assert.equal(data.alreadyPublished,true);assert.deepEqual(h.counts(),[1,2])
})
test('access failure is separate from a successful clinical commit',async()=>{
  const h=await publicationHarness();h.fail()
  const data=await (await h.route.publishPreviewConsultation(h.input)).json()
  assert.equal(data.ok,true);assert.equal(data.published,true);assert.ok(data.warnings.includes('clinic_access_requires_review'));assert.equal(data.accessUpdate.verified,false);assert.deepEqual(h.counts(),[1,1])
})
test('ambiguous recovered publication markers do not create a consultation or renew access',async()=>{
  const h=await publicationHarness(),row={id:visitId,fields:{'Notas del Terapeuta':publication.clinicConsultationPublicationMarker(otherId)}}
  h.setRecovered([row,{...row,id:accessId}]);assert.equal((await h.route.publishPreviewConsultation(h.input)).status,409);assert.deepEqual(h.counts(),[0,0])
})
