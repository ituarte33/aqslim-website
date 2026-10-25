import test from 'node:test'
import assert from 'node:assert/strict'
import { getClinicMaterialEvents, saveClinicMaterialEvent } from '../lib/clinic-plan-materials-store.ts'
import { SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID } from '../lib/nutrition/synthetic-preview-policy.ts'
import type { ClinicMaterialEvent } from '../lib/clinic-plan-materials.ts'
const patient='rec12345678901234'
const event: ClinicMaterialEvent = { kind:'clinic-plan-materials-v1',action:'release',planId:'rec22345678901234',revision:'test',at:'2026-10-24T20:00:00Z',label:'Plan',attachments:[] }
const record={id:'rec32345678901234',fields:{fldbQwEqdKsNFn3Ke:patient,fldelIlWTfLuMEqfQ:[patient],fldXhnn0sn0z3XMSX:true,fldsYW351kG68jXLk:JSON.stringify(event)}}
test('material store isolates patients, paginates, rejects Production, and verifies writes',async()=>{
 const fetchBefore=globalThis.fetch
 const keys=['VERCEL_ENV','VERCEL_GIT_COMMIT_REF','AIRTABLE_BASE_ID','AIRTABLE_PAT']
 const before=keys.map(key=>process.env[key])
 let calls=0
 try {
  Object.assign(process.env,{VERCEL_ENV:'production',VERCEL_GIT_COMMIT_REF:'myaq-clinic-functional-v1',AIRTABLE_BASE_ID:SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID,AIRTABLE_PAT:'test-only'})
  globalThis.fetch=async()=>{calls++;throw new Error('must not reach network')}
  assert.deepEqual(await getClinicMaterialEvents(patient),[])
  await assert.rejects(saveClinicMaterialEvent(patient,event,'test'),/DISABLED/)
  process.env.VERCEL_ENV='preview';process.env.AIRTABLE_BASE_ID='wrong'
  assert.deepEqual(await getClinicMaterialEvents(patient),[])
  assert.equal(calls,0)
  process.env.AIRTABLE_BASE_ID=SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID
  await assert.rejects(getClinicMaterialEvents('foreign-input'),/INVALID_PATIENT/)
  globalThis.fetch=async(input,init)=>{
   calls++
   assert.equal(init?.cache,'no-store')
   const url=new URL(String(input));assert.match(url.searchParams.get('filterByFormula')!,new RegExp(patient))
   if(calls===1)return Response.json({records:[record,{...record,fields:{...record.fields,fldelIlWTfLuMEqfQ:['recForeign']}}],offset:'page2'})
   assert.equal(url.searchParams.get('offset'),'page2')
   return Response.json({records:[{...record,fields:{...record.fields,fldbQwEqdKsNFn3Ke:'recForeign'}},{...record,fields:{...record.fields,fldXhnn0sn0z3XMSX:false}}]})
  }
  assert.deepEqual(await getClinicMaterialEvents(patient),[event]);assert.equal(calls,2)
  let saved=false
  globalThis.fetch=async(_input,init)=>{
   if(init?.method==='POST'){
    saved=true
    const payload=JSON.parse(String(init.body));assert.equal(payload.records[0].fields.fldbQwEqdKsNFn3Ke,patient)
    assert.equal(payload.records[0].fields.fldsYW351kG68jXLk,JSON.stringify(event))
    return Response.json({records:[record]})
   }
   assert.equal(saved,true);return Response.json(record)
  }
  await saveClinicMaterialEvent(patient,event,'test')
  globalThis.fetch=async(_input,init)=>init?.method==='POST'?Response.json({records:[record]}):Response.json({...record,fields:{...record.fields,fldbQwEqdKsNFn3Ke:'recForeign'}})
  await assert.rejects(saveClinicMaterialEvent(patient,event,'test'),/UNVERIFIED/)
  globalThis.fetch=async()=>new Response('',{status:503})
  await assert.rejects(getClinicMaterialEvents(patient),/UNAVAILABLE/)
 } finally {
  globalThis.fetch=fetchBefore;keys.forEach((key,i)=>before[i]===undefined?delete process.env[key]:process.env[key]=before[i])
 }
})
