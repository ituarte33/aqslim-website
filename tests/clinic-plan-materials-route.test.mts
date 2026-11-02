import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'
import * as policy from '../lib/clinic-plan-materials.ts'
import { isClinicRuntimeOperatorIdentity } from '../lib/clinic-runtime-policy.ts'

test('Clinic materials API requires a verified Clinic operator, rejects stale/foreign files and verifies an explicit assignment', async(t)=>{
 const previous = process.env.MYAQ_CLINIC_COLLABORATOR_EMAILS
 process.env.MYAQ_CLINIC_COLLABORATOR_EMAILS = 'editor@example.test'
 t.after(()=>{if(previous===undefined)delete process.env.MYAQ_CLINIC_COLLABORATOR_EMAILS;else process.env.MYAQ_CLINIC_COLLABORATOR_EMAILS=previous})
 const source=await readFile(new URL('../app/api/preview/clinic-plan-materials/route.ts',import.meta.url),'utf8')
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 const patientId='rec12345678901234'
 const plan={id:'rec22345678901234',fields:{'Dieta en Nutrimind':'Jing','Materiales asignados':[{id:'attCurrent',filename:'current.pdf',url:'https://example.test/current.pdf'}]}}
 let actor: {email:string;emailVerified?:boolean}|null=null, enabled=true, reads=0, saves=0
 const events: policy.ClinicMaterialEvent[]=[]
 const exports: Record<string,Function>={}
 const mocks:Record<string,unknown>={
  'next/server':{NextResponse:{json:(body:unknown,init?:ResponseInit)=>Response.json(body,init)}},
  'next/cache':{revalidatePath:()=>{}},
  '@/lib/auth':{getActor:async()=>actor},
  '@/lib/airtable':{getClienteById:async(id:string)=>{assert.equal(id,patientId);reads++;return {fields:{'Plan AQSLIM':[plan.id]}}},getPlanById:async()=>plan},
  '@/lib/clinic-runtime-policy':{assertClinicSourceWriteAllowed:()=>{},isClinicRuntimeOperatorIdentity:(identity:{email:string;emailVerified?:boolean})=>isClinicRuntimeOperatorIdentity({...identity,environment:{VERCEL_ENV:'production',VERCEL_GIT_COMMIT_REF:'main',MYAQ_CLINIC_ENABLED:'enabled'}})},
  '@/lib/clinic-plan-materials-store':{clinicMaterialStoreEnabled:()=>enabled,getClinicMaterialEvents:async()=>events,saveClinicMaterialEvent:async(id:string,event:policy.ClinicMaterialEvent)=>{assert.equal(id,patientId);saves++;events.unshift(event)}},
  '@/lib/clinic-plan-materials':policy,
 }
 vm.runInNewContext(code,{exports,require:(name:string)=>{if(!(name in mocks))throw new Error(name);return mocks[name]},process:{env:{}},URL,Date,JSON})
 const req=(body?:unknown)=>({nextUrl:new URL(`https://example.test/api?patientId=${patientId}`),json:async()=>body})
 assert.equal((await exports.GET(req())).status,401);assert.equal(reads,0)
 actor={email:'other@test'};assert.equal((await exports.GET(req())).status,403);assert.equal(reads,0)
 actor={email:'editor@example.test',emailVerified:false};assert.equal((await exports.GET(req())).status,403);assert.equal(reads,0)
 actor={email:'editor@example.test',emailVerified:true};enabled=false;assert.equal((await exports.GET(req())).status,404);assert.equal(reads,0);enabled=true
 const get=await exports.GET(req());assert.equal(get.status,200);assert.deepEqual((await get.json()).currentIds,[])
 const body={patientId,confirmation:'ASIGNAR MATERIALES PLAN ACTUAL',revision:policy.materialPlanRevision(plan),attachmentIds:['attCurrent']}
 assert.equal((await exports.POST(req({...body,revision:'stale'}))).status,409)
 assert.equal((await exports.POST(req({...body,attachmentIds:['foreignAttachment']}))).status,400);assert.equal(saves,0)
 assert.equal((await exports.POST(req(body))).status,200);assert.equal(saves,1)
 assert.deepEqual((await (await exports.GET(req())).json()).currentIds,['attCurrent'])
})
