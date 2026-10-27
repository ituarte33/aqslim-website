'use client'
import { useRef, useState } from 'react'
import type { reviewPatientAdministration } from '@/lib/clinic-patient-administration'
type Review=Awaited<ReturnType<typeof reviewPatientAdministration>>['review']
type Patient={id:string;name:string;email:string;phone:string;administrationState:string}
const control={padding:'10px 12px',border:'1px solid rgba(201,168,76,.45)',borderRadius:8,background:'#15140f',color:'#E2C87A'}
export function ClinicPatientAdministration({patientId,patients,readOnly}:{patientId:string;patients:Patient[];readOnly:boolean}) {
  const [open,setOpen]=useState(false),[action,setAction]=useState<'archive'|'restore'|'merge'>('archive')
  const [duplicateId,setDuplicateId]=useState(''),[review,setReview]=useState<Review|null>(null)
  const [reason,setReason]=useState(''),[confirmation,setConfirmation]=useState(''),[samePerson,setSamePerson]=useState(false)
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('')
  const guard=useRef(false),sequence=useRef(0)
  const selected=patients.find(p=>p.id===patientId)!
  const normalizedPhone=(p:Patient)=>p.phone.replace(/\D/g,'').slice(-10)
  const duplicates=patients.filter(p=>p.id!==patientId&&p.administrationState==='active'&&(
    Boolean(p.email&&p.email.trim().toLowerCase()===selected.email.trim().toLowerCase())||Boolean(normalizedPhone(p).length===10&&normalizedPhone(p)===normalizedPhone(selected))))
  function reset(){sequence.current++;setReview(null);setMessage('');setConfirmation('');setSamePerson(false)}
  async function prepare(){
    if(guard.current)return
    guard.current=true;setBusy(true);setMessage('');setReview(null)
    const version=++sequence.current
    try{
      const params=new URLSearchParams({patientId:action==='merge'?duplicateId:patientId,action})
      if(action==='merge')params.set('targetId',patientId)
      const response=await fetch(`/api/preview/clinic-patient-administration?${params}`,{cache:'no-store'})
      const data=await response.json()
      if(!response.ok||!data.ok)throw new Error()
      if(version===sequence.current)setReview(data.review)
    }catch{if(version===sequence.current)setMessage('No se pudo verificar la operación. Vuelve a revisar antes de continuar.')}
    finally{guard.current=false;setBusy(false)}
  }
  const word={archive:'ARCHIVAR',restore:'REACTIVAR',merge:'UNIFICAR'}[action]
  async function execute(){
    if(readOnly||!review?.executionEnabled||review.blockers.length||guard.current||confirmation!==word||reason.trim().length<5||(action==='merge'&&!samePerson))return
    guard.current=true;setBusy(true);setMessage('')
    try{
      const response=await fetch('/api/preview/clinic-patient-administration',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({patientId:review.source.id,targetId:review.target?.id,action,fingerprint:review.fingerprint,reason,confirmation,samePerson})})
      const data=await response.json()
      if(!response.ok||!data.ok||!data.result?.verified)throw new Error(data.error)
      // Reload canonical server state; stale list entries cannot imply success.
      window.location.assign(`/clinic-preview?patient=${encodeURIComponent(patientId)}`)
    }catch(error){setReview(null);setConfirmation('');setMessage(error instanceof Error&&error.message==='MERGE_PENDING_REVIEW_REQUIRED'?'La unificación quedó pendiente de revisión. Conservamos los expedientes y su historial. No repitas la operación.':'No se pudo confirmar el resultado. Revisa de nuevo el estado antes de intentar otra operación.')}
    finally{guard.current=false;setBusy(false)}
  }
  return <div style={{marginTop:16}}>
    <button type="button" aria-expanded={open} aria-controls="patient-administration-panel" style={{...control,cursor:'pointer'}} onClick={()=>setOpen(v=>!v)}>{open?'Cerrar administración':'Administrar paciente'}</button>
    {open?<section id="patient-administration-panel" aria-label="Administrar paciente" style={{marginTop:12,border:'1px solid rgba(201,168,76,.3)',borderRadius:12,padding:18,fontSize:13,lineHeight:1.65}}>
      <h3 style={{margin:'0 0 10px',fontFamily:'Georgia,serif',fontSize:23}}>Administrar paciente</h3>
      <p>Archivar conserva el historial y pausa el acceso al portal. Reactivar el expediente mantiene las fechas y restricciones de su acceso anterior.</p>
      <label htmlFor="patient-admin-action">Acción</label><select id="patient-admin-action" style={{...control,display:'block',width:'100%',marginBottom:12}} value={action} disabled={busy} onChange={event=>{reset();setAction(event.target.value as typeof action)}}>
        <option value="archive">Archivar paciente</option><option value="restore">Reactivar expediente archivado</option><option value="merge">Unificar duplicado</option>
      </select>
      {action==='merge'?<>
        <p><strong>Se conserva:</strong> {selected.name}. El historial compatible del duplicado se incorporará a este expediente; los datos existentes tienen prioridad.</p>
        <label htmlFor="patient-admin-duplicate">Duplicado que se retirará de la lista habitual</label>
        <select id="patient-admin-duplicate" value={duplicateId} disabled={busy} onChange={event=>{reset();setDuplicateId(event.target.value)}} style={{...control,display:'block',width:'100%',marginBottom:12}}>
          <option value="">Selecciona el duplicado…</option>{duplicates.map(p=><option key={p.id} value={p.id}>{p.name} · {p.email||p.phone}</option>)}
        </select>
        {!duplicates.length?<p>No se encontraron otros expedientes activos con el mismo correo o teléfono.</p>:null}
      </>:null}
      <button type="button" style={control} onClick={()=>void prepare()} disabled={busy||(action==='merge'&&!duplicateId)}>{busy?'Verificando…':'Revisar antes de continuar'}</button>
      {review?<div style={{marginTop:14}}>
        <p>{review.action==='merge'?`Se conserva ${review.target?.name}; se retira el duplicado ${review.source.name}.`:`Expediente: ${review.source.name} · ${review.source.state==='active'?'Activo':review.source.state==='archived'?'Archivado':'Requiere revisión'}`}</p>
        {review.source.history.length?<details><summary>Movimientos del expediente</summary><ul>{review.source.history.map((event,index)=><li key={index}>{event.at.slice(0,10)} · {event.reason}{event.sourceId&&event.sourceId!==patientId?<a style={{color:'#E2C87A',marginLeft:8}} href={`/clinic-preview?patient=${encodeURIComponent(event.sourceId)}`}>Consultar origen</a>:event.targetId&&event.targetId!==patientId?<a style={{color:'#E2C87A',marginLeft:8}} href={`/clinic-preview?patient=${encodeURIComponent(event.targetId)}`}>Abrir expediente principal</a>:null}</li>)}</ul></details>:null}
        {review.additions.length?<ul>{review.additions.map(a=><li key={a.label}>{a.label}: {a.count} registros se incorporarán sin borrar los originales.</li>)}</ul>:null}
        {review.conflicts.length?<p>Se conservarán los valores del expediente principal en: {review.conflicts.join(', ')}. Los originales seguirán disponibles en el duplicado archivado.</p>:null}
        {review.blockers.length?<ul style={{color:'#E0A0A0'}}>{review.blockers.map(b=><li key={b}>{b}</li>)}</ul>:review.alreadyDone?<p>El expediente ya está en el estado solicitado.</p>:<p>✓ Revisión completa. {review.action==='merge'?'Los expedientes originales permanecerán disponibles para consulta.':'El historial se conserva.'}</p>}
        {readOnly?<p style={{color:'#E2C87A'}}>Preview de revisión: puedes comprobar la operación. Los cambios se habilitarán al publicar Clinic.</p>:!review.blockers.length&&!review.alreadyDone?<>
          <label htmlFor="patient-admin-reason">Motivo</label><textarea id="patient-admin-reason" value={reason} maxLength={1000} disabled={busy} onChange={event=>setReason(event.target.value)} style={{...control,width:'100%',boxSizing:'border-box',display:'block'}} />
          {action==='merge'?<label style={{display:'flex',gap:8,marginTop:10}}><input type="checkbox" checked={samePerson} disabled={busy} onChange={event=>setSamePerson(event.target.checked)}/>Confirmo que ambos expedientes son de la misma persona y he revisado cuál se conserva.</label>:null}
          <label htmlFor="patient-admin-confirmation">Escribe {word} para confirmar</label><input id="patient-admin-confirmation" autoComplete="off" disabled={busy} value={confirmation} onChange={event=>setConfirmation(event.target.value.toUpperCase())} style={{...control,width:'100%',boxSizing:'border-box',display:'block',marginBottom:10}}/>
          <button type="button" style={control} disabled={busy||confirmation!==word||reason.trim().length<5||(action==='merge'&&!samePerson)} onClick={()=>void execute()}>Confirmar {action==='merge'?'unificación':action==='archive'?'archivo':'reactivación'}</button>
        </>:null}
      </div>:null}
      {message?<p role="status" style={{color:'#E0A0A0'}}>{message}</p>:null}
    </section>:null}
  </div>
}
