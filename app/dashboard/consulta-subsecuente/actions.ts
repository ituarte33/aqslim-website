'use server'

import {
  createConsulta, updateCliente, CLIENTES_FIELDS,
  getConsultasByCliente, getCuestionariosByCliente,
  type Consulta, type CuestionarioSintoma,
} from '@/lib/airtable'
import { requireCapability } from '@/lib/auth'

export async function fetchPatientConsultations(nombreCliente: string): Promise<Consulta[]> {
  await requireCapability('consultations:read:any')
  if (!nombreCliente) return []
  return getConsultasByCliente(nombreCliente)
}

export async function fetchPatientCuestionarios(nombreCliente: string): Promise<CuestionarioSintoma[]> {
  await requireCapability('consultations:read:any')
  if (!nombreCliente) return []
  return getCuestionariosByCliente(nombreCliente)
}

export async function saveConsultaSubsecuente(formData: FormData): Promise<{ id: string }> {
  await requireCapability('consultations:write:any')

  const clienteRecordId = (formData.get('clienteRecordId') as string).trim()
  const fechaConsulta   = (formData.get('fechaConsulta')   as string).trim()
  const nivelEnergia    = (formData.get('nivelEnergia')    as string | null) ?? ''
  const calidadSueno    = (formData.get('calidadSueno')    as string | null) ?? ''
  const recomendaciones = (formData.get('recomendaciones') as string | null)?.trim() ?? ''
  const proximaCita     = (formData.get('proximaCita')     as string | null)?.trim() ?? ''
  const metodoPago      = (formData.get('metodoPago')      as string | null)?.trim() ?? ''

  function num(key: string): number | undefined {
    const v = parseFloat((formData.get(key) as string | null) ?? '')
    return isNaN(v) ? undefined : v
  }
  function int(key: string): number | undefined {
    const v = parseInt((formData.get(key) as string | null) ?? '')
    return isNaN(v) ? undefined : v
  }

  const tipoConsulta     = (formData.get('tipoConsulta')     as string | null)?.trim() || 'Cliente subsecuente'
  const notasSuplemento  = (formData.get('notasSuplemento')  as string | null)?.trim() ?? ''

  const fields: Record<string, unknown> = {
    'ID Cliente':       [clienteRecordId],
    'Fecha Consulta':   fechaConsulta,
    'Tipo de Consulta': tipoConsulta,
  }

  if (notasSuplemento) fields['Notas del Terapeuta'] = notasSuplemento


  const peso             = num('pesoKg')
  const grasaCorporal    = num('grasaCorporal')
  const cintura          = num('cintura')
  const cadera           = num('cadera')
  const brazos           = num('brazos')
  const muslos           = num('muslos')
  const pecho            = num('pecho')
  const cumplimiento     = int('cumplimientoDieta')
  const comoSeSiente     = int('comoSeSiente')
  const montoCobrado     = num('montoCobrado')

  if (peso            !== undefined) fields['Peso (kg)']               = peso
  if (grasaCorporal   !== undefined) fields['% Grasa Corporal']        = grasaCorporal
  if (cintura         !== undefined) fields['Cintura (cm)']            = cintura
  if (cadera          !== undefined) fields['Cadera (cm)']             = cadera
  if (brazos          !== undefined) fields['Brazos (cm)']             = brazos
  if (muslos          !== undefined) fields['Muslos (cm)']             = muslos
  if (pecho           !== undefined) fields['Pecho/Busto (cm)']        = pecho
  if (cumplimiento    !== undefined) fields['Cumplimiento Dieta (1-10)'] = cumplimiento
  if (comoSeSiente    !== undefined) fields['Cómo Se Siente (1-10)']   = comoSeSiente
  if (montoCobrado    !== undefined) fields['Monto Cobrado ($)']        = montoCobrado
  const ansiedad   = (formData.get('ansiedad')   as string | null) ?? ''
  const tuvoHambre = (formData.get('tuvoHambre') as string | null) ?? ''
  if (ansiedad)    fields['¿Ansiedad?']               = ansiedad
  if (tuvoHambre)  fields['¿Tuvo Hambre?']            = tuvoHambre
  if (nivelEnergia)    fields['Nivel de Energía']           = nivelEnergia
  if (calidadSueno)    fields['Calidad de Sueño']           = calidadSueno
  if (recomendaciones) fields['Recomendaciones al Cliente'] = recomendaciones
  if (metodoPago)      fields['Método de Pago']             = metodoPago

  const consulta = await createConsulta(fields)

  // Próxima Cita lives on the Cliente record (the Consultas field is a lookup — read-only).
  if (proximaCita) {
    const d = new Date(proximaCita)
    const isoDate = isNaN(d.getTime()) ? proximaCita : d.toISOString()
    await updateCliente(clienteRecordId, { [CLIENTES_FIELDS.PROXIMA_CITA]: isoDate })
  }

  return { id: consulta.id }
}
