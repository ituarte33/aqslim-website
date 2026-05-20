'use server'

import { updateConsulta } from '@/lib/airtable'

export async function updateConsultaRecord(
  consultaId: string,
  formData: FormData,
): Promise<void> {
  function num(key: string): number | null {
    const v = parseFloat((formData.get(key) as string | null) ?? '')
    return isNaN(v) ? null : v
  }
  function int(key: string): number | null {
    const v = parseInt((formData.get(key) as string | null) ?? '')
    return isNaN(v) ? null : v
  }
  function str(key: string): string {
    return ((formData.get(key) as string | null) ?? '').trim()
  }

  const fields: Record<string, unknown> = {
    'Fecha Consulta':              str('fechaConsulta')    || null,
    'Tipo de Consulta':            str('tipoConsulta')     || null,
    'Peso (kg)':                   num('pesoKg'),
    '% Grasa Corporal':            num('grasaCorporal'),
    'Cintura (cm)':                num('cintura'),
    'Cadera (cm)':                 num('cadera'),
    'Brazos (cm)':                 num('brazos'),
    'Muslos (cm)':                 num('muslos'),
    'Pecho/Busto (cm)':            num('pecho'),
    'Cumplimiento Dieta (1-10)':   int('cumplimientoDieta'),
    'Cómo Se Siente (1-10)':       int('comoSeSiente'),
    'Nivel de Energía':            str('nivelEnergia')     || null,
    'Calidad de Sueño':            str('calidadSueno')     || null,
    '¿Ansiedad?':                  str('ansiedad')         || null,
    '¿Tuvo Hambre?':               str('tuvoHambre')       || null,
    'Recomendaciones al Cliente':  str('recomendaciones'),
    'Notas del Terapeuta':         str('notasSuplemento'),
    'Método de Pago':              str('metodoPago')       || null,
    'Monto Cobrado ($)':           num('montoCobrado'),
  }

  // Strip out undefined — Airtable accepts null (clear field) but not undefined
  for (const key of Object.keys(fields)) {
    if (fields[key] === undefined) delete fields[key]
  }

  await updateConsulta(consultaId, fields)
}
