'use server'

import { updateCliente, CLIENTES_FIELDS } from '@/lib/airtable'

function mmddyyyyToISO(date: string): string | undefined {
  const parts = date.split('/')
  if (parts.length !== 3 || parts[2].length !== 4) return undefined
  const [mm, dd, yyyy] = parts
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

export async function updatePaciente(formData: FormData): Promise<void> {
  const clienteId      = (formData.get('clienteId')       as string).trim()
  const firstName      = (formData.get('firstName')       as string).trim()
  const lastName       = (formData.get('lastName')        as string).trim()
  const email          = (formData.get('email')           as string).trim().toLowerCase()
  const telefono       = (formData.get('telefono')        as string).trim()
  const fechaNacimiento= (formData.get('fechaNacimiento') as string).trim()
  const sexo           = (formData.get('sexo')            as string).trim()
  const direccion      = ((formData.get('direccion')      as string) ?? '').trim()
  const ciudad         = ((formData.get('ciudad')         as string) ?? '').trim()
  const zip            = ((formData.get('zip')            as string) ?? '').trim()
  const idioma         = (formData.get('idioma')          as string).trim()
  const unidadDePeso   = (formData.get('unidadDePeso')   as string).trim()
  const pesoMeta       = ((formData.get('pesoMeta')      as string) ?? '').trim()
  const comoNosConocio = ((formData.get('comoNosConocio') as string) ?? '').trim()
  const estadoDelCliente=(formData.get('estadoDelCliente') as string).trim()
  const metaDelCliente = ((formData.get('metaDelCliente') as string) ?? '').trim()
  const condiciones    = ((formData.get('condiciones')   as string) ?? '').trim()

  const nombre = [firstName, lastName].filter(Boolean).join(' ')

  const fields: Record<string, unknown> = {
    [CLIENTES_FIELDS.NOMBRE_COMPLETO]:    nombre,
    [CLIENTES_FIELDS.EMAIL]:              email,
    [CLIENTES_FIELDS.TELEFONO]:           telefono,
    [CLIENTES_FIELDS.SEXO]:               sexo,
    [CLIENTES_FIELDS.IDIOMA_PREFERIDO]:   idioma,
    [CLIENTES_FIELDS.UNIDAD_DE_PESO]:     unidadDePeso,
    [CLIENTES_FIELDS.COMO_NOS_CONOCIO]:   comoNosConocio,
    [CLIENTES_FIELDS.META_DEL_CLIENTE]:   metaDelCliente,
    [CLIENTES_FIELDS.ESTADO_DEL_CLIENTE]: estadoDelCliente,
    [CLIENTES_FIELDS.CONDICIONES_ALERGIAS]: condiciones,
    [CLIENTES_FIELDS.DIRECCION]:          direccion,
    [CLIENTES_FIELDS.CIUDAD]:             ciudad,
  }

  const fechaISO = mmddyyyyToISO(fechaNacimiento)
  if (fechaISO)  fields[CLIENTES_FIELDS.FECHA_NACIMIENTO] = fechaISO
  if (zip)       fields[CLIENTES_FIELDS.ZIP]              = parseInt(zip, 10)
  if (pesoMeta)  fields[CLIENTES_FIELDS.PESO_META]        = parseInt(pesoMeta, 10)

  await updateCliente(clienteId, fields)
}
