export const PATIENT_ADMIN_START = '[MYAQ-PATIENT-ADMIN-v1]'
export const PATIENT_ADMIN_END = '[/MYAQ-PATIENT-ADMIN-v1]'
export type PatientAdminState = 'active' | 'archived' | 'merging' | 'merged' | 'invalid'
export type PatientAdminEvent = { action: 'archive' | 'restore' | 'merge_started' | 'merge_completed'; at: string; actor: string; reason: string; targetId?: string; operationId?: string; sourceId?: string; before?: Record<string, unknown> }
export type PatientAdmin = { state: PatientAdminState; targetId?: string; events: PatientAdminEvent[] }
export type AdminPatient = { id: string; fields: Record<string, unknown> }
const validId = (value: unknown): value is string => typeof value === 'string' && /^rec[A-Za-z0-9]{14}$/.test(value)
export function patientAdministration(notes: unknown): PatientAdmin {
  if (typeof notes !== 'string' || (!notes.includes(PATIENT_ADMIN_START) && !notes.includes(PATIENT_ADMIN_END))) return { state: 'active', events: [] }
  try {
    const parts = notes.split(PATIENT_ADMIN_START)
    if (parts.length !== 2 || parts[0].includes(PATIENT_ADMIN_END)) throw new Error()
    const tail = parts[1].split(PATIENT_ADMIN_END)
    if (tail.length !== 2 || tail[1].trim()) throw new Error()
    const data = JSON.parse(tail[0])
    if (data.version !== 1 || !['active','archived','merging','merged'].includes(data.state) || !Array.isArray(data.events)
      || data.events.some((e: PatientAdminEvent) => !['archive','restore','merge_started','merge_completed'].includes(e.action) || !e.actor || !e.reason || !Number.isFinite(Date.parse(e.at)))) throw new Error()
    if (['merging','merged'].includes(data.state) && !validId(data.targetId)) throw new Error()
    return data
  } catch { return { state: 'invalid', events: [] } }
}
export function patientIsUnavailable(patient: AdminPatient): boolean {
  return patientAdministration(patient.fields['Notas Generales']).state !== 'active'
}
export function administeredNotes(notes: unknown, state: Exclude<PatientAdminState,'invalid'>, event: PatientAdminEvent): string {
  const previous = patientAdministration(notes)
  if (previous.state === 'invalid') throw new Error('PATIENT_ADMIN_INVALID')
  const text = typeof notes === 'string' ? notes : ''
  const body = text.includes(PATIENT_ADMIN_START) ? text.slice(0, text.indexOf(PATIENT_ADMIN_START)).trimEnd() : text.trimEnd()
  const result = `${body}${body ? '\n\n' : ''}${PATIENT_ADMIN_START}\n${JSON.stringify({version:1,state,...(['merging','merged'].includes(state) ? {targetId:event.targetId} : {}),events:[...previous.events,event]})}\n${PATIENT_ADMIN_END}`
  if (result.length > 95000) throw new Error('PATIENT_ADMIN_AUDIT_FULL')
  if (patientAdministration(result).state !== state) throw new Error('PATIENT_ADMIN_INVALID')
  return result
}

// Reciprocal patient links can be added without deleting the original record or
// changing a visit's dates, measured values, payments or original patient link.
export const MERGE_LINK_FIELDS = ['Consultas','Auriculoterapia','Auriculoterapia 2','Auriculoterapia 3','Plan AQSLIM','Cuestionario Sintomas','Ayunos 36h','Mediciones Fast 36','Pilot_Feedback'] as const
export const MERGE_REVIEW_FIELDS = ['Email','Teléfono','Fecha Nacimiento','Sexo','Dirección','Ciudad','ZIP','Idioma Preferido','Fecha Primera Consulta','Meta del Cliente','Unidad de Peso','Peso Meta','Condiciones Especiales / Alergias','Estatura (cm)'] as const
const CLINIC_LINK_FIELDS = ['AQSLIM Clinic Notes Preview','AQSLIM Clinic Consultations Preview','AQSLIM Clinic Plans Preview']
function text(value: unknown) { return String(value ?? '').trim() }
function empty(value: unknown) { return value === null || value === undefined || value === '' }
function ids(value: unknown): string[] { return Array.isArray(value) ? value.filter(validId) : [] }
export function planPatientMerge({ source, target, protectedReferences = 0, accounts }: {
  source: AdminPatient; target: AdminPatient; protectedReferences?: number;
  accounts: { id: string; boundPatientId: string | null; verified: boolean }[]
}) {
  const blockers: string[] = [], conflicts: string[] = [], additions: { label: string; count: number }[] = []
  const fields: Record<string, unknown> = {}
  if (!validId(source.id) || !validId(target.id) || source.id === target.id) blockers.push('Selecciona dos expedientes distintos.')
  if (patientIsUnavailable(source) || patientIsUnavailable(target)) blockers.push('Ambos expedientes deben estar activos y sin operaciones pendientes.')
  const sameEmail = Boolean(text(source.fields.Email) && text(source.fields.Email).toLowerCase() === text(target.fields.Email).toLowerCase())
  const phone = (p: AdminPatient) => text(p.fields['Teléfono']).replace(/\D/g,'').slice(-10)
  const samePhone = phone(source).length === 10 && phone(source) === phone(target)
  if (!sameEmail && !samePhone) blockers.push('No coincide el correo ni el teléfono. Revisa la identidad antes de unificar.')
  if (text(source.fields.Email) && text(target.fields.Email) && !sameEmail) blockers.push('Los correos son distintos. Revisa las cuentas antes de unificar.')
  if (accounts.length > 1 || accounts.some(a => !a.verified || (a.boundPatientId && ![source.id,target.id].includes(a.boundPatientId)))) blockers.push('Hay cuentas sin verificar, múltiples cuentas o un vínculo con otro paciente.')
  if (protectedReferences > 0) blockers.push('El duplicado tiene acceso, perfil nutricional o datos de aplicación que requieren revisión individual antes de unificar.')
  if (text(source.fields.Meal_Logs)) blockers.push('El duplicado tiene registros de alimentación que requieren revisión individual antes de unificar.')
  if (CLINIC_LINK_FIELDS.some(key => ids(source.fields[key]).length > 0)) blockers.push('El duplicado tiene registros adicionales de Clinic que requieren revisión individual antes de unificar.')
  const knownArrays = new Set<string>([...MERGE_LINK_FIELDS,...CLINIC_LINK_FIELDS])
  if (Object.entries(source.fields).some(([key,value]) => !knownArrays.has(key) && ids(value).length > 0)) blockers.push('Hay historial vinculado que requiere revisión antes de unificar.')
  for (const key of MERGE_LINK_FIELDS) {
    const original = ids(target.fields[key]), incoming = ids(source.fields[key])
    const added = incoming.filter(id => !original.includes(id))
    if (key === 'Plan AQSLIM' && added.length && original.length) blockers.push('Ambos expedientes tienen planes distintos. Define primero el plan que debe permanecer vigente.')
    if (added.length) { fields[key] = [...original,...added]; additions.push({label:key,count:added.length}) }
  }
  for (const key of MERGE_REVIEW_FIELDS) {
    const a = source.fields[key], b = target.fields[key]
    if (empty(b) && !empty(a)) fields[key] = a
    else if (!empty(a) && !empty(b) && text(a).toLowerCase() !== text(b).toLowerCase()) {
      conflicts.push(key)
      if (key === 'Fecha Nacimiento' || key === 'Sexo') blockers.push(`No coincide ${key}. Revisa la identidad.`)
    }
  }
  return { blockers: [...new Set(blockers)], conflicts, additions, fields }
}
