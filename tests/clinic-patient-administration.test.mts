import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'
import { createHash } from 'node:crypto'
import * as policy from '../lib/clinic-patient-administration-policy.ts'
const sourceId='rec12345678901234',targetId='rec22345678901234',visit1='rec33333333333333',visit2='rec44444444444444'
const noteField='fldpU1kw9F3aTArWQ'
const event={action:'archive' as const,at:'2026-10-27T00:00:00.000Z',actor:'founder@example.test',reason:'Synthetic archive'}
function patients(){return {
  source:{id:sourceId,fields:{'Nombre Completo':'Synthetic duplicate',Email:'synthetic@example.test','Teléfono':'6195550123','Consultas':[visit1],'Notas Generales':'Original source clinical notes'}},
  target:{id:targetId,fields:{'Nombre Completo':'Synthetic primary',Email:'synthetic@example.test','Teléfono':'6195550123','Consultas':[visit2],'Notas Generales':'Original target clinical notes'}},
}}
async function load(file:string,mocks:Record<string,unknown>,extra={}){
  const source=await readFile(new URL(file,import.meta.url),'utf8')
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  const exports:Record<string,Function>={}
  vm.runInNewContext(code,{exports,require:(id:string)=>{assert.ok(id in mocks,`Missing mock ${id}`);return mocks[id]},Date,JSON,URL,URLSearchParams,Response,Error,...extra})
  return exports
}
test('archive audit preserves clinical notes, records history and is reversible; merge remains distinct',()=>{
  const archived=policy.administeredNotes('Clinical history','archived',event)
  assert.ok(archived.startsWith('Clinical history\n'))
  assert.equal(policy.patientIsUnavailable({id:sourceId,fields:{'Notas Generales':archived}}),true)
  const active=policy.administeredNotes(archived,'active',{...event,action:'restore'})
  assert.equal(policy.patientAdministration(active).events.length,2)
  assert.equal(policy.patientIsUnavailable({id:sourceId,fields:{'Notas Generales':active}}),false)
  assert.ok(active.startsWith('Clinical history\n'))
})
test('corrupt, duplicate or incomplete administration markers fail closed',()=>{
  const valid=policy.administeredNotes('Clinical history','archived',event)
  for(const text of [policy.PATIENT_ADMIN_START,policy.PATIENT_ADMIN_END,valid+valid,valid+'unexpected',valid.replace('archived','unknown')]){
    assert.equal(policy.patientAdministration(text).state,'invalid')
    assert.equal(policy.patientIsUnavailable({id:sourceId,fields:{'Notas Generales':text}}),true)
    assert.throws(()=>policy.administeredNotes(text,'active',{...event,action:'restore'}))
  }
})
test('merge plan unions linked history without overwriting target data or mutating originals',()=>{
  const {source,target}=patients();const before=JSON.stringify({source,target})
  Object.assign(source.fields,{'Ciudad':'Source city','Fecha Nacimiento':'1980-01-01'})
  Object.assign(target.fields,{'Ciudad':'Target city'})
  const snapshot=JSON.stringify({source,target})
  const plan=policy.planPatientMerge({source,target,accounts:[]})
  assert.equal(plan.blockers.length,0)
  assert.deepEqual(plan.fields.Consultas,[visit2,visit1])
  assert.equal(plan.fields['Ciudad'],undefined)
  assert.equal(plan.fields['Fecha Nacimiento'],'1980-01-01')
  assert.deepEqual(plan.conflicts,['Ciudad'])
  assert.equal(JSON.stringify({source,target}),snapshot)
  assert.ok(before.length>0)
})
test('unsafe merges are blocked: identity, accounts, plans, unhandled links and protected app records',()=>{
  const cases=[
    ({source,target}:any)=>{source.id=target.id},
    ({source}:any)=>{source.fields.Email='someoneelse@example.test'},
    ({source}:any)=>{source.fields['Plan AQSLIM']=[visit1]},
    ({source}:any)=>{source.fields['Custom relation']=[visit1]},
    ({source}:any)=>{source.fields['AQSLIM Clinic Notes Preview']=[visit1]},
    ({source}:any)=>{source.fields.Meal_Logs='external-log-reference'},
    ({source}:any)=>{source.fields['Notas Generales']=policy.administeredNotes('','archived',event)},
  ]
  for(const mutate of cases){const pair:any=patients();if(cases.indexOf(mutate)===2)pair.target.fields['Plan AQSLIM']=[visit2];mutate(pair);assert.ok(policy.planPatientMerge({...pair,accounts:[]}).blockers.length)}
  const pair=patients()
  assert.ok(policy.planPatientMerge({...pair,accounts:[],protectedReferences:1}).blockers.length)
  assert.ok(policy.planPatientMerge({...pair,accounts:[{id:'user',boundPatientId:visit1,verified:true}]}).blockers.length)
  assert.ok(policy.planPatientMerge({...pair,accounts:[{id:'user',boundPatientId:null,verified:false}]}).blockers.length)
})
async function harness(){
  const pair=patients(),records:any={[sourceId]:pair.source,[targetId]:pair.target}
  let mode='production',writes:any[]=[],metadataWrites=0,failTarget=false,providerDown=false,protectedCount=0,targetGrant:any=null
  const account:any={id:'user_synthetic',privateMetadata:{aqslimPatientId:sourceId,pilot:{keep:'untouched'}},emailAddresses:[{emailAddress:'synthetic@example.test',verification:{status:'verified'}}]}
  const clone=(v:any)=>JSON.parse(JSON.stringify(v))
  const clerk={users:{
    getUserList:async()=>({data:[clone(account)]}),getUser:async()=>clone(account),
    updateUserMetadata:async(_id:string,input:any)=>{metadataWrites++;Object.assign(account.privateMetadata,input.privateMetadata)},
  }}
  const service=await load('../lib/clinic-patient-administration.ts',{
    'server-only':{},'node:crypto':{createHash,randomUUID:()=> 'synthetic-operation'},
    '@clerk/nextjs/server':{clerkClient:async()=>clerk},
    './airtable':{getClienteById:async(id:string)=>clone(records[id]),updateCliente:async(id:string,fields:any)=>{
      if(failTarget&&id===targetId&&fields.Consultas)throw new Error('Synthetic write failure')
      writes.push({id,fields:clone(fields)})
      for(const [key,value]of Object.entries(fields))records[id].fields[key===noteField?'Notas Generales':key]=clone(value)
      return clone(records[id])
    }},
    './clinic-runtime-policy':{clinicRuntimeMode:()=>mode},
    './nutrition/synthetic-preview-policy':{SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID:'synthetic-base'},
    './clinic-patient-administration-policy':policy,
    './preview-entitlement-store':{getPortalAccessRecordByPatientRecordId:async()=>targetGrant},
  },{process:{env:{AIRTABLE_BASE_ID:'synthetic-base',AIRTABLE_PAT:'synthetic-token'}},fetch:async()=>{
    if(providerDown)throw new Error('Synthetic provider failure')
    return new Response(JSON.stringify({records:protectedCount?[{}]:[]}),{status:200})
  }})
  const input=(review:any,action='merge')=>({patientId:sourceId,targetId:action==='merge'?targetId:undefined,action,fingerprint:review.fingerprint,reason:'Synthetic reviewed operation',actor:'founder@example.test',samePerson:true})
  return {service,records,account,input,counts:()=>[writes.length,metadataWrites],writes:()=>writes,
    setMode:(value:string)=>{mode=value},fail:()=>{failTarget=true},down:()=>{providerDown=true},protected:()=>{protectedCount=1},grant:(value:any)=>{targetGrant=value}}
}
test('candidate review performs no writes; execution and stale fingerprints are blocked',async()=>{
  const h=await harness();h.setMode('candidate')
  const review=(await h.service.reviewPatientAdministration({patientId:sourceId,targetId,action:'merge'})).review
  assert.equal(review.executionEnabled,false);assert.equal(review.blockers.length,0);assert.deepEqual(h.counts(),[0,0])
  await assert.rejects(h.service.executePatientAdministration(h.input(review)),/READ_ONLY/)
  h.setMode('production')
  await assert.rejects(h.service.executePatientAdministration({...h.input(review),fingerprint:'stale'}),/REVIEW_CHANGED/)
  assert.deepEqual(h.counts(),[0,0])
})
test('archiving and restoring verify persisted audit without changing grants, visits or Clerk metadata',async()=>{
  const h=await harness()
  let review=(await h.service.reviewPatientAdministration({patientId:sourceId,action:'archive'})).review
  await h.service.executePatientAdministration(h.input(review,'archive'))
  assert.equal(policy.patientIsUnavailable(h.records[sourceId]),true)
  assert.deepEqual(h.records[sourceId].fields.Consultas,[visit1])
  review=(await h.service.reviewPatientAdministration({patientId:sourceId,action:'restore'})).review
  await h.service.executePatientAdministration(h.input(review,'restore'))
  assert.equal(policy.patientIsUnavailable(h.records[sourceId]),false)
  assert.deepEqual(h.counts(),[2,0])
  assert.ok(h.writes().every(w=>Object.keys(w.fields).join(',')===noteField))
})
test('merge verifies history and account binding, preserves source notes and metadata, and journals before updates',async()=>{
  const h=await harness()
  const review=(await h.service.reviewPatientAdministration({patientId:sourceId,targetId,action:'merge'})).review
  const result=await h.service.executePatientAdministration(h.input(review))
  assert.equal(result.verified,true);assert.equal(result.state,'merged')
  assert.deepEqual(h.records[targetId].fields.Consultas,[visit2,visit1])
  assert.deepEqual(h.records[sourceId].fields.Consultas,[visit1])
  assert.ok(h.records[targetId].fields['Notas Generales'].includes('Original source clinical notes'))
  assert.ok(h.records[targetId].fields['Notas Generales'].includes('Original target clinical notes'))
  assert.equal(h.account.privateMetadata.aqslimPatientId,targetId)
  assert.equal(h.account.privateMetadata.pilot.keep,'untouched')
  assert.equal(policy.patientAdministration(h.records[sourceId].fields['Notas Generales']).state,'merged')
  const first=h.writes()[0];assert.equal(first.id,sourceId)
  assert.equal(policy.patientAdministration(first.fields[noteField]).state,'merging')
  assert.equal(h.writes().some(w=>w.id===visit1||w.id===visit2),false)
  const again=(await h.service.reviewPatientAdministration({patientId:sourceId,targetId,action:'merge'})).review
  assert.ok(again.blockers.length)
})
test('uncertain merge remains journaled and blocked, with no blind retry or deletion',async()=>{
  const h=await harness();h.fail()
  const review=(await h.service.reviewPatientAdministration({patientId:sourceId,targetId,action:'merge'})).review
  await assert.rejects(h.service.executePatientAdministration(h.input(review)),/MERGE_PENDING_REVIEW_REQUIRED/)
  assert.equal(policy.patientAdministration(h.records[sourceId].fields['Notas Generales']).state,'merging')
  assert.deepEqual(h.records[targetId].fields.Consultas,[visit2]);assert.deepEqual(h.records[sourceId].fields.Consultas,[visit1])
  const after=(await h.service.reviewPatientAdministration({patientId:sourceId,targetId,action:'merge'})).review
  assert.ok(after.blockers.length);assert.deepEqual(h.counts(),[1,0])
})
test('source protected references, provider errors and mismatched target access cannot be silently bypassed',async()=>{
  const h=await harness();h.protected()
  assert.ok((await h.service.reviewPatientAdministration({patientId:sourceId,targetId,action:'merge'})).review.blockers.length)
  const k=await harness();k.down()
  await assert.rejects(k.service.reviewPatientAdministration({patientId:sourceId,targetId,action:'merge'}),/provider failure/)
  const m=await harness();m.grant({storedSubjectId:'some-other-user'})
  assert.ok((await m.service.reviewPatientAdministration({patientId:sourceId,targetId,action:'merge'})).review.blockers.length)
  assert.deepEqual(h.counts(),[0,0]);assert.deepEqual(k.counts(),[0,0]);assert.deepEqual(m.counts(),[0,0])
})
test('merge requires explicit same-person confirmation and a reason',async()=>{
  const h=await harness(),review=(await h.service.reviewPatientAdministration({patientId:sourceId,targetId,action:'merge'})).review
  await assert.rejects(h.service.executePatientAdministration({...h.input(review),samePerson:false}),/SAME_PERSON/)
  await assert.rejects(h.service.executePatientAdministration({...h.input(review),reason:''}),/REASON/)
  assert.deepEqual(h.counts(),[0,0])
})
test('administration endpoint requires Founder, same origin, production, and action-specific confirmation',async()=>{
  const {NextRequest,NextResponse}=await import('next/server')
  let mode='candidate',actor:any=null,founder=true,writes=0
  const route=await load('../app/api/preview/clinic-patient-administration/route.ts',{
    'next/server':{NextRequest,NextResponse},'@/lib/auth':{getActor:async()=>actor},
    '@/lib/clinic-runtime-policy':{clinicRuntimeEnvironment:()=>({}),clinicRuntimeMode:()=>mode,isClinicRuntimeFounderIdentity:()=>founder},
    '@/lib/clinic-patient-administration':{reviewPatientAdministration:async()=>({review:{action:'archive'}}),executePatientAdministration:async()=>{writes++;return{verified:true}}},
  })
  const request=(origin='https://synthetic.test',confirmation='ARCHIVAR')=>new NextRequest('https://synthetic.test/api/preview/clinic-patient-administration',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({patientId:sourceId,action:'archive',fingerprint:'x',reason:'Reviewed action',confirmation})})
  assert.equal((await route.POST(request())).status,401)
  actor={email:'founder@example.test'};founder=false;assert.equal((await route.POST(request())).status,403)
  founder=true;assert.equal((await route.POST(request())).status,409);assert.equal(writes,0)
  mode='production';assert.equal((await route.POST(request('https://foreign.test'))).status,403)
  assert.equal((await route.POST(request(undefined,'UNIFICAR'))).status,409)
  const result=await route.POST(request());assert.equal(result.status,200);assert.equal(writes,1)
  assert.match(result.headers.get('cache-control'),/no-store/)
})

test('identity lookup skips only completed merges across pages; archives still prevent ambiguous login',async()=>{
  const source=await readFile(new URL('../lib/airtable.ts',import.meta.url),'utf8')
  const functionSource=source.slice(source.indexOf('export async function getClientesByEmail('),source.indexOf('export async function getClienteByEmail('))
  const code=ts.transpileModule(functionSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  const exports:any={};let calls=0,includeArchived=false
  vm.runInNewContext(code,{exports,URLSearchParams,decodeURIComponent,patientAdministration:policy.patientAdministration,escapeAirtableString:(s:string)=>s,CLIENTES_TABLE:'synthetic-patients',airtableFetch:async(path:string)=>{
    calls++
    if(!path.includes('offset='))return{records:[{id:sourceId,fields:{'Notas Generales':policy.administeredNotes('','merged',{...event,action:'merge_completed',targetId})}}],offset:'next'}
    return{records:[{id:targetId,fields:{}},...(includeArchived?[{id:visit1,fields:{'Notas Generales':policy.administeredNotes('','archived',event)}}]:[])]}
  }})
  let matches=await exports.getClientesByEmail('synthetic@example.test')
  assert.equal(matches.length,1);assert.equal(matches[0].id,targetId);assert.equal(calls,2)
  includeArchived=true
  matches=await exports.getClientesByEmail('synthetic@example.test')
  assert.equal(matches.length,2)
})

test('authenticated patient scope denies archived or merged histories even with an explicit Clerk binding',async()=>{
  const source=await readFile(new URL('../lib/auth.ts',import.meta.url),'utf8')
  const functionSource=source.slice(source.indexOf('export const getOwnPatient ='),source.indexOf('export async function requireOwnPatient('))
  const code=ts.transpileModule(functionSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  const exports:any={};let notes=policy.administeredNotes('','archived',event)
  class AuthorizationError extends Error{}
  vm.runInNewContext(code,{exports,cache:(fn:any)=>fn,AuthorizationError,patientIsUnavailable:policy.patientIsUnavailable,requireActor:async()=>({role:'patient',boundPatientId:sourceId,email:'synthetic@example.test'}),getClientesByEmail:async()=>[],resolveAuthenticatedPatientScope:()=>sourceId,getClienteById:async()=>({id:sourceId,fields:{'Notas Generales':notes}})})
  await assert.rejects(exports.getOwnPatient(),/FORBIDDEN/)
  notes=policy.administeredNotes(notes,'active',{...event,action:'restore'})
  assert.equal((await exports.getOwnPatient()).id,sourceId)
  notes=policy.administeredNotes(notes,'merged',{...event,action:'merge_completed',targetId})
  await assert.rejects(exports.getOwnPatient(),/FORBIDDEN/)
})
