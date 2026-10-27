import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'
import * as runtime from '../lib/clinic-runtime-policy.ts'
import * as materials from '../lib/clinic-plan-materials.ts'
import * as policy from '../lib/materials-policy.ts'
import * as phase from '../lib/phase-materials.ts'

async function load(path:string,mocks:Record<string,unknown>,fetcher?:typeof fetch){
 const source=await readFile(new URL(path,import.meta.url),'utf8')
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 const exports:Record<string,Function>={}
 vm.runInNewContext(code,{exports,require:(id:string)=>{if(!(id in mocks))throw new Error(`Missing mock ${id}`);return mocks[id]},fetch:fetcher,process,URL,URLSearchParams,Response,Date,JSON,console:{error:()=>{}},Error})
 return {exports,source}
}
test('production plan publication archives before update, returns only current phase materials, and candidate mode never writes',async()=>{
 const keys=['VERCEL_ENV','VERCEL_GIT_COMMIT_REF','MYAQ_CLINIC_ENABLED','MYAQ_CLINIC_WRITES_PAUSED'];const saved=keys.map(key=>process.env[key])
 const patientId='rec12345678901234',planId='rec22345678901234'
 let current={id:planId,fields:{'Notas del Plan':'Jing','Dieta en Nutrimind':'Plan Jing','Fase Actual':'Jing','Fecha Inicio Tratamiento':'2026-10-01','Fecha Inicio Fase Actual':'2026-10-01','Instrucciones Especiales':'Jing actual','Semana en Fase Actual':1,'Materiales asignados':[{id:'attOld',filename:'old_hipocaloric.pdf',url:'https://example.test/old.pdf'}]} as Record<string,unknown>}
 const calls:string[]=[];const events:materials.ClinicMaterialEvent[]=[];let failArchive=false
 try{
  Object.assign(process.env,{VERCEL_ENV:'production',VERCEL_GIT_COMMIT_REF:'main',MYAQ_CLINIC_ENABLED:'enabled'})
  const source=await readFile(new URL('../app/api/preview/clinic-plans/route.ts',import.meta.url),'utf8')
  const F=vm.runInNewContext('('+source.match(/const F = (\{[\s\S]*?\}) as const/)![1]+')')
  const fields={ [F.KEY]:runtime.clinicPlanDraftKey(patientId),[F.PATIENT_ID]:patientId,[F.PATIENT]:[patientId],[F.PREVIEW_ONLY]:false,
   [F.STATUS]:'Ready for Review',[F.LABEL]:'Qi actual',[F.DIET]:'Plan Qi',[F.PHASE]:'Qi',[F.PHASE_WEEK]:1,[F.TREATMENT_START]:'2026-10-01',[F.PHASE_START]:'2026-10-25',[F.INSTRUCTIONS]:'Qi actual',[F.TIER]:'Clinic',
  }
  const patient={id:patientId,fields:{'Nombre Completo':'Synthetic patient','Plan AQSLIM':[planId]}}
  const names={PATIENT_NAME:'Nombre Cliente',PLAN_LABEL:'Notas del Plan',TREATMENT_START:'Fecha Inicio Tratamiento',PHASE:'Fase Actual',WEEK:'Semana en Fase Actual',PHASE_START:'Fecha Inicio Fase Actual',CALORIE_TARGET:'Calorías Objetivo',NUTRIMIND_DIET:'Dieta en Nutrimind',SPECIAL_INSTRUCTIONS:'Instrucciones Especiales',KENKHO_TIER:'Nivel Kenkho Path',STARTING_WEIGHT_KG:'Peso Inicio (kg)',CURRENT_WEIGHT_KG:'Peso Actual (kg)',GOAL_WEIGHT_KG:'Peso Meta (kg)'}
  const airtable={PLAN_AQSLIM_FIELDS:names,getClienteById:async()=>patient,getClientes:async()=>[],getPlanById:async()=>current,
   updatePlan:async(id:string,changes:Record<string,unknown>)=>{assert.equal(id,planId);calls.push('update');current={...current,fields:{...current.fields,...changes}};return current},createPlanForPatient:()=>{throw new Error('must not create unrelated plan')},
  }
  const fetcher:typeof fetch=async(input,init)=>{
   if(init?.method==='PATCH'){Object.assign(fields,JSON.parse(String(init.body)).fields);return Response.json({id:'rec33333333333333',fields})}
   if(String(input).includes('/rec33333333333333?'))return Response.json({id:'rec33333333333333',fields})
   assert.ok(String(input).includes('tblSaxNRZxJLpsnIm'));return Response.json({records:[{id:'rec33333333333333',fields}]})
  }
  const mocks={
   '@/lib/clinic-runtime-policy':runtime,'@/lib/clinic-plan-materials':materials,
   '@/lib/clinic-plan-materials-store':{saveClinicMaterialEvent:async(id:string,event:materials.ClinicMaterialEvent)=>{assert.equal(id,patientId);if(failArchive)throw new Error('archive failed');calls.push('archive');events.push(event)}},
   'next/server':{NextResponse:{json:(body:unknown,init?:ResponseInit)=>Response.json(body,init)}},
   '@/lib/auth':{getActor:async()=>({email:'rom@ituarteconsulting.com'})},'@/lib/airtable':airtable,
   '@/lib/clinic-plan-readiness':{getClinicPlanReadiness:()=>({ready:true,checks:[]})},
   '@/lib/clinic-date':{normalizeClinicIsoDate:(value:string)=>value},'@/lib/clinic-weight-entry':{clinicWeightInKg:(value:number)=>value},
  }
  const route=(await load('../app/api/preview/clinic-plans/route.ts',mocks,fetcher)).exports
  const request={nextUrl:new URL('https://example.test/api'),json:async()=>({patientId,confirmation:'PUBLICAR PLAN PREVIEW'})}
  const response=await route.PUT(request);assert.equal(response.status,200,JSON.stringify({body:await response.clone().json(),current:current.fields}))
  assert.deepEqual(calls,['archive','update']);assert.equal(events[0].planFields?.['Fase Actual'],'Jing');assert.equal(current.fields['Fase Actual'],'Qi')
  const portal=(await load('../lib/patient-materials.ts',{
   'server-only':{},react:{cache:(fn:Function)=>fn},'@/lib/airtable':airtable,
   '@/lib/auth':{requireOwnPatient:async(cap:string)=>{assert.equal(cap,'portal:read:self');return patient}},
   '@/lib/materials-policy':policy,'@/lib/phase-materials':phase,'@/lib/clinic-runtime-policy':runtime,'@/lib/clinic-plan-materials':materials,
   '@/lib/clinic-plan-materials-store':{getClinicMaterialEvents:async(id:string)=>{assert.equal(id,patientId);return events}},
  })).exports
  const result=await portal.getPatientPortalMaterials(1)
  assert.deepEqual(Array.from(result.materials,(item:any)=>item.id),['phase-guide-qi','phase-document-qi'])
  assert.ok(!JSON.stringify(result).includes('old.pdf'));assert.ok(!JSON.stringify(result).includes('phase-document-jing'))
  calls.length=0;process.env.MYAQ_CLINIC_WRITES_PAUSED='true'
  assert.notEqual((await route.PUT(request)).status,200);assert.equal(calls.length,0);assert.equal(current.fields['Fase Actual'],'Qi')
  delete process.env.MYAQ_CLINIC_WRITES_PAUSED
  calls.length=0;fields[F.STATUS]='Ready for Review';fields[F.PHASE]='Xue';fields[F.LABEL]='Xue';failArchive=true
  assert.notEqual((await route.PUT(request)).status,200);assert.equal(calls.length,0);assert.equal(current.fields['Fase Actual'],'Qi')
  failArchive=false;process.env.VERCEL_ENV='preview';process.env.VERCEL_GIT_COMMIT_REF=runtime.CLINIC_RELEASE_BRANCH
  assert.equal((await route.PUT(request)).status,409);assert.equal(calls.length,0)
 }finally{keys.forEach((key,i)=>saved[i]===undefined?delete process.env[key]:process.env[key]=saved[i])}
})
