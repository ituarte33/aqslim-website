'use server'

import { currentUser } from '@clerk/nextjs/server'
import { getClienteByEmail, updateCliente, CLIENTES_FIELDS } from '@/lib/airtable'

function mmddyyyyToISO(date: string): string | undefined {
  const parts = date.split('/')
  if (parts.length !== 3 || parts[2].length !== 4) return undefined
  const [mm, dd, yyyy] = parts
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

export async function saveProfile(formData: FormData) {
  const user = await currentUser()
  if (!user) throw new Error('Not authenticated')

  const email = user.emailAddresses[0]?.emailAddress
  if (!email) throw new Error('No email')

  const firstName       = (formData.get('firstName') as string).trim()
  const lastName        = (formData.get('lastName') as string).trim()
  const telefono        = (formData.get('telefono') as string).trim()
  const fechaNacimiento = (formData.get('fechaNacimiento') as string).trim()
  const sexo            = (formData.get('sexo') as string).trim()
  const direccion       = ((formData.get('direccion') as string) ?? '').trim()
  const ciudad          = ((formData.get('ciudad') as string) ?? '').trim()
  const zip             = ((formData.get('zip') as string) ?? '').trim()
  const idioma          = (formData.get('idioma') as string).trim()
  const unidadDePeso    = (formData.get('unidadDePeso') as string).trim()
  const pesoMeta        = ((formData.get('pesoMeta') as string) ?? '').trim()
  const comoNosConocio  = (formData.get('comoNosConocio') as string).trim()
  const metaDelCliente  = ((formData.get('metaDelCliente') as string) ?? '').trim()
  const condiciones     = ((formData.get('condiciones') as string) ?? '').trim()

  const cliente = await getClienteByEmail(email)
  if (!cliente) throw new Error('Registro no encontrado')

  const fields: Record<string, unknown> = {
    [CLIENTES_FIELDS.NOMBRE_COMPLETO]:    [firstName, lastName].filter(Boolean).join(' '),
    [CLIENTES_FIELDS.TELEFONO]:           telefono,
    [CLIENTES_FIELDS.SEXO]:              sexo,
    [CLIENTES_FIELDS.IDIOMA_PREFERIDO]:  idioma,
    [CLIENTES_FIELDS.UNIDAD_DE_PESO]:    unidadDePeso,
    [CLIENTES_FIELDS.COMO_NOS_CONOCIO]:  comoNosConocio,
    [CLIENTES_FIELDS.META_DEL_CLIENTE]:  metaDelCliente,
    [CLIENTES_FIELDS.ACEPTO_TERMINOS]:   true,
    [CLIENTES_FIELDS.ESTADO_DEL_CLIENTE]: 'Nuevo',
  }

  const fechaISO = mmddyyyyToISO(fechaNacimiento)
  if (fechaISO) fields[CLIENTES_FIELDS.FECHA_NACIMIENTO] = fechaISO

  if (direccion)          fields[CLIENTES_FIELDS.DIRECCION]            = direccion
  if (ciudad)             fields[CLIENTES_FIELDS.CIUDAD]               = ciudad
  if (zip)                fields[CLIENTES_FIELDS.ZIP]                  = parseInt(zip, 10)
  if (pesoMeta)           fields[CLIENTES_FIELDS.PESO_META]            = parseInt(pesoMeta, 10)
  if (condiciones)        fields[CLIENTES_FIELDS.CONDICIONES_ALERGIAS] = condiciones

  await updateCliente(cliente.id, fields)
}
