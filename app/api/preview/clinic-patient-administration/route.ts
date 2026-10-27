import { NextRequest, NextResponse } from 'next/server'
import { getActor } from '@/lib/auth'
import { clinicRuntimeEnvironment, clinicRuntimeMode, isClinicRuntimeFounderIdentity } from '@/lib/clinic-runtime-policy'
import { reviewPatientAdministration, executePatientAdministration } from '@/lib/clinic-patient-administration'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store','Vary':'Cookie, Authorization'}
async function founder() {
  const environment=clinicRuntimeEnvironment()
  if (!['candidate','production'].includes(clinicRuntimeMode(environment)??'')) throw new Error('NOT_FOUND')
  const actor=await getActor()
  if (!actor) throw new Error('UNAUTHENTICATED')
  if (!isClinicRuntimeFounderIdentity({email:actor.email,environment})) throw new Error('FORBIDDEN')
  return actor
}
function action(value:unknown):'archive'|'restore'|'merge' {
  if(value!=='archive'&&value!=='restore'&&value!=='merge') throw new Error('INVALID_REQUEST')
  return value
}
function failure(error:unknown) {
  const message=error instanceof Error?error.message:''
  const safe=['NOT_FOUND','UNAUTHENTICATED','FORBIDDEN','INVALID_REQUEST','INVALID_PATIENT','REVIEW_CHANGED','PATIENT_ADMIN_READ_ONLY','PATIENT_ADMIN_BLOCKED','REASON_REQUIRED','SAME_PERSON_REQUIRED','CONFIRMATION_REQUIRED','MERGE_PENDING_REVIEW_REQUIRED'].includes(message)?message:'PATIENT_ADMIN_UNAVAILABLE'
  return NextResponse.json({ok:false,error:safe},{headers,status:message==='NOT_FOUND'?404:message==='UNAUTHENTICATED'?401:message==='FORBIDDEN'?403:409})
}
export async function GET(request:NextRequest) {
  try {
    await founder()
    const result=await reviewPatientAdministration({patientId:request.nextUrl.searchParams.get('patientId')??'',targetId:request.nextUrl.searchParams.get('targetId')??undefined,action:action(request.nextUrl.searchParams.get('action'))})
    return NextResponse.json({ok:true,review:result.review},{headers})
  }catch(error){return failure(error)}
}
export async function POST(request:NextRequest) {
  try {
    const actor=await founder()
    if(request.headers.get('origin')!==request.nextUrl.origin) throw new Error('FORBIDDEN')
    if(clinicRuntimeMode()!=='production') throw new Error('PATIENT_ADMIN_READ_ONLY')
    const body=await request.json() as Record<string,unknown>
    const operation=action(body.action)
    if(body.confirmation!==({archive:'ARCHIVAR',restore:'REACTIVAR',merge:'UNIFICAR'}[operation])) throw new Error('CONFIRMATION_REQUIRED')
    if(typeof body.patientId!=='string'||typeof body.fingerprint!=='string'||typeof body.reason!=='string'||(body.targetId!==undefined&&typeof body.targetId!=='string')) throw new Error('INVALID_REQUEST')
    const result=await executePatientAdministration({patientId:body.patientId,targetId:body.targetId as string|undefined,action:operation,fingerprint:body.fingerprint,reason:body.reason,actor:actor.email,samePerson:body.samePerson===true})
    return NextResponse.json({ok:true,result},{headers})
  }catch(error){return failure(error)}
}
