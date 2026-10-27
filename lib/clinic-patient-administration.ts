import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { clerkClient } from '@clerk/nextjs/server'
import { getClienteById, updateCliente } from './airtable'
import { getPortalAccessRecordByPatientRecordId } from './preview-entitlement-store'
import { clinicRuntimeMode } from './clinic-runtime-policy'
import { SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID } from './nutrition/synthetic-preview-policy'
import { administeredNotes, patientAdministration, planPatientMerge, type PatientAdminEvent, type AdminPatient } from './clinic-patient-administration-policy'
const NOTES_FIELD = 'fldpU1kw9F3aTArWQ'
const REFERENCE_TABLES = ['tblkAuEOcCA5sek4n','tblSrSHrgmqTHyQzq','tbljMLa7RCRzBYZBI','tbl0cTWsYqv4R5n3u','tblSaxNRZxJLpsnIm']
function configured() {
  if (process.env.AIRTABLE_BASE_ID !== SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID || !process.env.AIRTABLE_PAT) throw new Error('PATIENT_ADMIN_UNAVAILABLE')
}
async function protectedReferenceCount(patientId: string) {
  configured()
  const counts = await Promise.all(REFERENCE_TABLES.map(async table => {
    const params = new URLSearchParams({filterByFormula:`{Patient Record ID} = "${patientId}"`,maxRecords:'1','fields[]':'Patient Record ID'})
    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${table}?${params}`, {cache:'no-store',headers:{Authorization:`Bearer ${process.env.AIRTABLE_PAT}`}})
    if (!response.ok) throw new Error('PATIENT_ADMIN_UNAVAILABLE')
    const data = await response.json() as {records?: unknown[]}
    if (!Array.isArray(data.records)) throw new Error('PATIENT_ADMIN_UNAVAILABLE')
    return data.records.length
  }))
  return counts.reduce((a,b)=>a+b,0)
}
function hash(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex') }
function patientSummary(p: AdminPatient) {
  const admin=patientAdministration(p.fields['Notas Generales'])
  return {history:admin.events.map(({action,at,reason,targetId,sourceId})=>({action,at,reason,targetId,sourceId})),id:p.id,name:String(p.fields['Nombre Completo'] ?? ''),email:String(p.fields.Email ?? ''),state:patientAdministration(p.fields['Notas Generales']).state}
}
export async function reviewPatientAdministration({patientId,targetId,action}: {patientId:string;targetId?:string;action:'archive'|'restore'|'merge'}) {
  configured()
  if (!/^rec[A-Za-z0-9]{14}$/.test(patientId) || (targetId && !/^rec[A-Za-z0-9]{14}$/.test(targetId))) throw new Error('INVALID_PATIENT')
  const source = await getClienteById(patientId)
  if (!source) throw new Error('PATIENT_NOT_FOUND')
  const state = patientAdministration(source.fields['Notas Generales'])
  if (action !== 'merge') {
    const blockers = state.state === 'invalid' || state.state === 'merging' || state.state === 'merged'
      ? ['Este expediente requiere revisión de administración antes de modificarlo.'] : []
    return {source,target:null,accounts:[],fields:{},review:{action,source:patientSummary(source),target:null,blockers,conflicts:[],additions:[],fingerprint:hash({action,source}),executionEnabled:clinicRuntimeMode()==='production',alreadyDone:action==='archive'?state.state==='archived':state.state==='active'}}
  }
  if (!targetId || targetId === patientId) throw new Error('INVALID_PATIENT')
  const target = await getClienteById(targetId)
  if (!target) throw new Error('PATIENT_NOT_FOUND')
  const emails = [...new Set([source.fields.Email,target.fields.Email].filter((v):v is string=>typeof v==='string' && Boolean(v.trim())).map(v=>v.trim().toLowerCase()))]
  const clerk = await clerkClient()
  const [references, accountLists, targetEntitlement] = await Promise.all([
    protectedReferenceCount(patientId),
    Promise.all(emails.map(email=>clerk.users.getUserList({emailAddress:[email],limit:3}))),
    getPortalAccessRecordByPatientRecordId({patientRecordId:target.id,canonicalSubjectId:`patient:${target.id}`,reviewOnly:true}),
  ])
  const unique = new Map(accountLists.flatMap(list=>list.data).filter(u=>u.emailAddresses.some(a=>emails.includes(a.emailAddress.trim().toLowerCase()))).map(u=>[u.id,u]))
  const accounts = [...unique.values()].map(u=>({id:u.id,boundPatientId:typeof u.privateMetadata.aqslimPatientId==='string'?u.privateMetadata.aqslimPatientId.trim()||null:null,verified:u.emailAddresses.some(a=>emails.includes(a.emailAddress.trim().toLowerCase())&&a.verification?.status==='verified')}))
  const plan = planPatientMerge({source,target,protectedReferences:references,accounts})
  if (targetEntitlement && targetEntitlement.storedSubjectId!==`patient:${target.id}` && (accounts.length!==1||targetEntitlement.storedSubjectId!==accounts[0].id)) plan.blockers.push('El acceso del expediente principal pertenece a otra cuenta o no se pudo verificar.')
  return {source,target,accounts,fields:plan.fields,review:{action,source:patientSummary(source),target:patientSummary(target),blockers:plan.blockers,conflicts:plan.conflicts,additions:plan.additions,fingerprint:hash({source,target,references,accounts,targetEntitlement,fields:plan.fields}),executionEnabled:clinicRuntimeMode()==='production',alreadyDone:false}}
}
async function saveNotes(patient: AdminPatient, notes: string) {
  const current = await getClienteById(patient.id)
  if (current.fields['Notas Generales'] !== patient.fields['Notas Generales']) throw new Error('REVIEW_CHANGED')
  await updateCliente(patient.id,{[NOTES_FIELD]:notes})
  const verified = await getClienteById(patient.id)
  if (verified.fields['Notas Generales'] !== notes) throw new Error('PATIENT_ADMIN_VERIFY_FAILED')
  return verified
}
export async function executePatientAdministration(input: {patientId:string;targetId?:string;action:'archive'|'restore'|'merge';fingerprint:string;reason:string;actor:string;samePerson:boolean}) {
  if (clinicRuntimeMode()!=='production') throw new Error('PATIENT_ADMIN_READ_ONLY')
  const snapshot = await reviewPatientAdministration(input)
  if (snapshot.review.fingerprint!==input.fingerprint) throw new Error('REVIEW_CHANGED')
  if (snapshot.review.blockers.length) throw new Error('PATIENT_ADMIN_BLOCKED')
  if (input.reason.trim().length<5 || input.reason.length>1000) throw new Error('REASON_REQUIRED')
  if (snapshot.review.alreadyDone) return {verified:true,state:patientAdministration(snapshot.source.fields['Notas Generales']).state}
  const event = {actor:input.actor,at:new Date().toISOString(),reason:input.reason.trim()}
  if (input.action!=='merge') {
    const state=input.action==='archive'?'archived':'active'
    await saveNotes(snapshot.source,administeredNotes(snapshot.source.fields['Notas Generales'],state,{...event,action:input.action}))
    return {verified:true,state}
  }
  if (!input.samePerson || !snapshot.target) throw new Error('SAME_PERSON_REQUIRED')
  const target=snapshot.target,source=snapshot.source
  const operationId=randomUUID()
  const started:PatientAdminEvent={...event,action:'merge_started',targetId:target.id,operationId,before:Object.fromEntries(Object.keys(snapshot.fields).map(key=>[key,target.fields[key]??null]))}
  // A durable, verified journal precedes the first relationship update. Failure
  // leaves the duplicate blocked with a visible pending state for manual recovery.
  try {
  const pending=await saveNotes(source,administeredNotes(source.fields['Notas Generales'],'merging',started))
  const currentTarget=await getClienteById(target.id)
  if (hash(currentTarget)!==hash(target)) throw new Error('MERGE_PENDING_REVIEW_REQUIRED')
  if (Object.keys(snapshot.fields).length) {
    await updateCliente(target.id,snapshot.fields)
    const readback=await getClienteById(target.id)
    if (Object.entries(snapshot.fields).some(([key,value])=>JSON.stringify(readback.fields[key])!==JSON.stringify(value))) throw new Error('MERGE_PENDING_REVIEW_REQUIRED')
  }
  const clerk=await clerkClient()
  for(const account of snapshot.accounts) {
    const current=await clerk.users.getUser(account.id)
    const binding=current.privateMetadata.aqslimPatientId
    if (binding && binding!==source.id && binding!==target.id) throw new Error('MERGE_PENDING_REVIEW_REQUIRED')
    if (!current.emailAddresses.some(a=>a.emailAddress.trim().toLowerCase()===snapshot.review.target?.email.trim().toLowerCase()&&a.verification?.status==='verified')) throw new Error('MERGE_PENDING_REVIEW_REQUIRED')
    if (binding===source.id) {
      await clerk.users.updateUserMetadata(account.id,{privateMetadata:{aqslimPatientId:target.id}})
      const verified=await clerk.users.getUser(account.id)
      if(verified.privateMetadata.aqslimPatientId!==target.id) throw new Error('MERGE_PENDING_REVIEW_REQUIRED')
    }
  }
  // Keep source notes, identifiers and all original links for traceability. The
  // canonical patient additionally receives its own audit reference to that source.
  const canonical=await getClienteById(target.id)
  if(patientAdministration(canonical.fields['Notas Generales']).state!=='active') throw new Error('MERGE_PENDING_REVIEW_REQUIRED')
  const completed:PatientAdminEvent={...event,action:'merge_completed',targetId:target.id,sourceId:source.id,operationId,reason:`${event.reason}; expediente de origen=${source.id}`}
  const startMarker='[MYAQ-PATIENT-ADMIN-v1]'
  const sourceNotes=String(source.fields['Notas Generales']??'').split(startMarker)[0].trim()
  const targetNotes=String(canonical.fields['Notas Generales']??'')
  const markerIndex=targetNotes.indexOf(startMarker)
  const body=markerIndex<0?targetNotes:targetNotes.slice(0,markerIndex)
  const audit=markerIndex<0?'':targetNotes.slice(markerIndex)
  const combined=sourceNotes?`${body.trimEnd()}\n\nNotas incorporadas del expediente ${source.id}:\n${sourceNotes}\n\n${audit}`:targetNotes
  await saveNotes(canonical,administeredNotes(combined,'active',completed))
  const latestSource=await getClienteById(source.id)
  if(latestSource.fields['Notas Generales']!==pending.fields['Notas Generales']) throw new Error('MERGE_PENDING_REVIEW_REQUIRED')
  await saveNotes(latestSource,administeredNotes(latestSource.fields['Notas Generales'],'merged',completed))
  return {verified:true,state:'merged',targetId:target.id}
  } catch { throw new Error('MERGE_PENDING_REVIEW_REQUIRED') }
}
