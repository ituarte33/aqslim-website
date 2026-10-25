import test from 'node:test'
import assert from 'node:assert/strict'
import { clinicRuntimeMode, isClinicRuntimeFounderIdentity, CLINIC_RELEASE_BRANCH, clinicRecordInScope, clinicRecordFilter, clinicPlanDraftKey, assertClinicSourceWriteAllowed } from '../lib/clinic-runtime-policy.ts'
const founder='rom@ituarteconsulting.com'
test('release gating requires the exact branch and explicit production enablement, with Founder-only access',()=>{
 assert.equal(clinicRuntimeMode({VERCEL_ENV:'production',VERCEL_GIT_COMMIT_REF:'main'}),null)
 assert.equal(clinicRuntimeMode({VERCEL_ENV:'production',VERCEL_GIT_COMMIT_REF:'main',MYAQ_CLINIC_ENABLED:'enabled'}),'production')
 assert.equal(clinicRuntimeMode({VERCEL_ENV:'production',VERCEL_GIT_COMMIT_REF:'other',MYAQ_CLINIC_ENABLED:'enabled'}),null)
 assert.equal(clinicRuntimeMode({VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:CLINIC_RELEASE_BRANCH}),'candidate')
 assert.equal(clinicRuntimeMode({VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'arbitrary'}),null)
 const environment={VERCEL_ENV:'production',VERCEL_GIT_COMMIT_REF:'main',MYAQ_CLINIC_ENABLED:'enabled'}
 assert.equal(isClinicRuntimeFounderIdentity({email:founder,environment}),true)
 assert.equal(isClinicRuntimeFounderIdentity({email:'other-admin@test',environment}),false)
})
test('production excludes Preview data and wrong-patient or unversioned rows; candidate cannot write',()=>{
 const keys=['VERCEL_ENV','VERCEL_GIT_COMMIT_REF','MYAQ_CLINIC_ENABLED'];const saved=keys.map(key=>process.env[key])
 const patient='rec12345678901234';const ids={patientId:'patient',preview:'preview',key:'key'}
 try {
  Object.assign(process.env,{VERCEL_ENV:'production',VERCEL_GIT_COMMIT_REF:'main',MYAQ_CLINIC_ENABLED:'enabled'})
  assert.equal(clinicPlanDraftKey(patient),`live:${patient}:v1`)
  assert.match(clinicRecordFilter(patient,'Note Key'),/NOT\(\{Preview Only\}\)/)
  assert.equal(clinicRecordInScope({patient,preview:false,key:`live:${patient}:note`},patient,ids),true)
  for(const fields of [{patient,preview:true,key:`live:${patient}:note`},{patient,preview:false,key:`${patient}:test`},{patient:'other',preview:false,key:`live:${patient}:note`}]) assert.equal(clinicRecordInScope(fields,patient,ids),false)
  assert.doesNotThrow(assertClinicSourceWriteAllowed)
  process.env.VERCEL_ENV='preview';process.env.VERCEL_GIT_COMMIT_REF=CLINIC_RELEASE_BRANCH
  assert.throws(assertClinicSourceWriteAllowed,/READ_ONLY/)
  process.env.VERCEL_GIT_COMMIT_REF='myaq-clinic-functional-v1'
  assert.equal(clinicPlanDraftKey(patient),`${patient}:v1`)
  assert.doesNotThrow(assertClinicSourceWriteAllowed)
 }finally{keys.forEach((key,i)=>saved[i]===undefined?delete process.env[key]:process.env[key]=saved[i])}
})
