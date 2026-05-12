'use server'

import { createConsulta } from '@/lib/airtable'

export async function saveConsultaSubsecuente(formData: FormData): Promise<{ id: string }> {
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

  const fields: Record<string, unknown> = {
    'ID Cliente':       [clienteRecordId],   // linked record field — must be array of record IDs
    'Fecha Consulta':   fechaConsulta,
    'Tipo de Consulta': 'Cliente subsecuente',
  }


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
  if (proximaCita) {
    const d = new Date(proximaCita)
    fields['Próxima Cita'] = isNaN(d.getTime()) ? proximaCita : d.toISOString()
  }
  if (metodoPago)      fields['Método de Pago']             = metodoPago

  const consulta = await createConsulta(fields)
  return { id: consulta.id }
}
